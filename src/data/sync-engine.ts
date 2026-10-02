import { eq } from 'drizzle-orm';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { openDb } from './db';
import { households, donations, outbox, syncState } from './schema';
import { localEvent, serializeHlc, type Hlc } from '../lib/hlc';
import { syncPush, syncPull, syncBootstrap, type SyncMutation } from '../api/sync';
import type { ApiClient } from '../api/client';

import { getDeviceId } from '../lib/device';

const HLC_STATE_KEY = 'sync_hlc_state';
let inMemoryHlc: Hlc | null = null;

/**
 * Persisted so the clock survives an app restart — an HLC that resets to (0,0) on
 * every launch could produce a value lower than one already written, breaking
 * monotonicity (offline-sync-protocol.md §3). In-memory caching avoids heavy Keystore IPC.
 */
async function tickClock(): Promise<Hlc> {
  const node = await getDeviceId();
  if (inMemoryHlc === null) {
    const stored = await SecureStore.getItemAsync(HLC_STATE_KEY);
    inMemoryHlc = stored !== null ? (JSON.parse(stored) as Hlc) : { wall: 0, counter: 0, node };
  }
  inMemoryHlc = localEvent(inMemoryHlc, Date.now());
  void SecureStore.setItemAsync(HLC_STATE_KEY, JSON.stringify(inMemoryHlc)).catch(() => {});
  return inMemoryHlc;
}

export type RecordDonationInput = {
  id: string;
  fundId: string;
  amountMinor: number;
  currency: string;
  occurredOn: string;
  method: string;
  donorHouseholdId: string | null;
  donorName: string | null;
  anonymous: boolean;
  receiptNo: string | null;
  note: string | null;
};

export type RecordHouseholdInput = {
  id: string;
  name: string;
  addressLine1: string | null;
  area: string | null;
  phone: string | null;
  monthlyDuesMinor: number;
  exempt: boolean;
  joinedOn: string | null;
};

/**
 * Writes the local row and its outbox entry in the SAME transaction (§4.2) — this is
 * the entire mechanism behind I1 (no financial record is ever lost). There is no
 * window in which the caller sees a saved record whose sync is not queued.
 */
export async function recordDonationOffline(input: RecordDonationInput): Promise<void> {
  const db = await openDb();
  const hlc = await tickClock();
  const mutationId = Crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(donations).values({
      id: input.id, fundId: input.fundId, amountMinor: input.amountMinor, currency: input.currency,
      occurredOn: input.occurredOn, method: input.method, donorHouseholdId: input.donorHouseholdId,
      donorName: input.donorName, anonymous: input.anonymous, receiptNo: input.receiptNo, note: input.note,
      dirty: true, pendingOp: 'insert',
    });
    await tx.insert(outbox).values({
      mutationId, entity: 'donations', entityId: input.id, op: 'insert',
      payload: JSON.stringify(input), hlc: serializeHlc(hlc),
      dependsOn: input.donorHouseholdId === null ? null : JSON.stringify([input.donorHouseholdId]),
      createdAt: Date.now(),
    });
  });
}

export async function recordHouseholdOffline(input: RecordHouseholdInput): Promise<void> {
  const db = await openDb();
  const hlc = await tickClock();
  const mutationId = Crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(households).values({
      id: input.id, name: input.name, addressLine1: input.addressLine1, area: input.area,
      phone: input.phone, monthlyDuesMinor: input.monthlyDuesMinor, exempt: input.exempt,
      joinedOn: input.joinedOn, dirty: true, pendingOp: 'insert',
    });
    await tx.insert(outbox).values({
      mutationId, entity: 'households', entityId: input.id, op: 'insert',
      payload: JSON.stringify(input), hlc: serializeHlc(hlc), dependsOn: null, createdAt: Date.now(),
    });
  });
}

/** Push always precedes pull (§5.4) — pulling first would overwrite a row about to be pushed. */
export async function runSync(api: ApiClient, mosqueId: string): Promise<void> {
  await pushOutbox(api, mosqueId);
  await pullChanges(api, mosqueId);
}

/**
 * First sync for a tenant (§5.1) — seeds the local tables from whatever the server
 * already holds, once per entity, so a fresh install (or a mosque switch, once that
 * exists) doesn't show an empty donations/households list for data that already exists
 * server-side. Idempotent: checks sync_state.bootstrapped first.
 */
export async function bootstrapIfNeeded(api: ApiClient, mosqueId: string): Promise<void> {
  const db = await openDb();
  const entities = ['donations', 'households'] as const;
  const needsBootstrap: string[] = [];

  for (const entity of entities) {
    const state = await db.select().from(syncState).where(eq(syncState.entity, entity)).limit(1);
    if (state[0]?.bootstrapped !== true) needsBootstrap.push(entity);
  }
  if (needsBootstrap.length === 0) return;

  const response = await syncBootstrap(api, mosqueId, needsBootstrap, Crypto.randomUUID());

  await db.transaction(async (tx) => {
    for (const entity of needsBootstrap) {
      const result = response.entities[entity];
      if (!result) continue;

      const table = entity === 'donations' ? donations : households;
      for (const row of result.rows) {
        // See pullChanges' note on `as never` and the changeSeq/serverVersion gap —
        // same bridge, same known limitation, here at bootstrap time instead of pull.
        await tx.insert(table).values(row as never)
          .onConflictDoUpdate({ target: table.id, set: row as never });
      }
      await tx.insert(syncState).values({ entity, cursor: result.cursor, bootstrapped: true, lastSyncAt: Date.now() })
        .onConflictDoUpdate({ target: syncState.entity, set: { cursor: result.cursor, bootstrapped: true, lastSyncAt: Date.now() } });
    }
  });
}

async function pushOutbox(api: ApiClient, mosqueId: string): Promise<void> {
  const db = await openDb();
  const pending = await db.select().from(outbox).where(eq(outbox.status, 'pending')).orderBy(outbox.seq);
  if (pending.length === 0) return;

  const mutations: SyncMutation[] = pending.map((row) => ({
    mutationId: row.mutationId,
    entity: row.entity as 'donations' | 'households',
    entityId: row.entityId,
    op: row.op as 'insert' | 'update' | 'delete',
    hlc: row.hlc,
    dependsOn: row.dependsOn === null ? [] : (JSON.parse(row.dependsOn) as string[]),
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    // Always [] — every mutation this engine currently produces is an insert, which
    // ignores changedFields server-side. A future household-edit action must populate
    // it with exactly the fields the user changed (see SyncMutation's own doc comment).
    changedFields: [],
  }));

  const deviceId = await getDeviceId();
  const response = await syncPush(api, mosqueId, deviceId, mutations, Crypto.randomUUID());

  for (const result of response.results) {
    const source = pending.find((p) => p.mutationId === result.mutationId);
    if (!source) continue;

    if (result.status === 'accepted' || result.status === 'duplicate' || result.status === 'conflict') {
      // Clear _dirty and stamp the canonical sync metadata, then drop the outbox row —
      // exactly the client action the wire protocol specifies for all three statuses:
      // 'duplicate' is the retry path that delivers I2, and 'conflict' with
      // resolution 'field_merge' is automatic (offline-sync-protocol.md §5.2: "apply
      // the resolution") — there is no manual-resolution case for the two entities this
      // engine handles today, so it's applied the same as an outright accept.
      const table = source.entity === 'donations' ? donations : households;
      await db.update(table).set({
        serverVersion: result.serverVersion, changeSeq: result.changeSeq,
        dirty: false, pendingOp: null,
      }).where(eq(table.id, source.entityId));
      await db.delete(outbox).where(eq(outbox.seq, source.seq));
    } else {
      // 'rejected' — keep the local row, mark the outbox entry failed, never discard
      // silently (§5.2's table). Surfacing this to the user is not yet built (a
      // conflict-inbox-equivalent for rejections) — a named gap.
      await db.update(outbox).set({
        status: 'failed', lastError: `${result.code}: ${result.message}`,
        attempts: source.attempts + 1,
      }).where(eq(outbox.seq, source.seq));
    }
  }
}

async function pullChanges(api: ApiClient, mosqueId: string): Promise<void> {
  const db = await openDb();
  const entities = ['donations', 'households'] as const;

  for (const entity of entities) {
    const state = await db.select().from(syncState).where(eq(syncState.entity, entity)).limit(1);
    const since = state[0]?.cursor ?? 0;

    const response = await syncPull(api, mosqueId, [entity], since);
    const change = response.changes[entity];
    if (!change || change.rows.length === 0) continue;

    const table = entity === 'donations' ? donations : households;
    await db.transaction(async (tx) => {
      for (const row of change.rows) {
        // Server rows are canonical — upsert wholesale, same as syncMosqueConfig.
        // Local field-merge on top of an incoming row would matter once households
        // support update via sync; insert-only means there is nothing to merge yet.
        // `as never`: `row` is the API layer's deliberately loose Record<string,
        // unknown> (see api/sync.ts's note on why these responses aren't schema-typed
        // yet), bridged into Drizzle's strongly-typed insert shape. Known gap this
        // surfaces: the backend's donationToCanonical/householdToCanonical don't
        // include changeSeq/serverVersion/hlc in the row payload itself, so a pulled
        // row's own sync-metadata columns stay NULL locally even once synced — cursor
        // resumability (I5) is unaffected, since sync_state.cursor is the real source
        // of truth for "what's been pulled," not each row's own change_seq.
        await tx.insert(table).values(row as never)
          .onConflictDoUpdate({ target: table.id, set: row as never });
      }
      await tx.insert(syncState).values({ entity, cursor: change.cursor, bootstrapped: true, lastSyncAt: Date.now() })
        .onConflictDoUpdate({ target: syncState.entity, set: { cursor: change.cursor, lastSyncAt: Date.now() } });
    });
  }
}

export type FailedMutation = typeof outbox.$inferSelect;

/**
 * The conflict-inbox equivalent named as a gap earlier in the build — narrower than the
 * protocol doc's full §6.3 design (side-by-side versions, keep-mine/keep-theirs/merge-
 * manually), since a `rejected` mutation isn't a genuine conflict with a resolvable
 * "theirs" to compare against — it's the server refusing the write outright (a business
 * rule, a missing dependency, a malformed payload). Retry is the one action that's
 * always safe to offer here: it doesn't touch or discard anything, it just re-attempts
 * the exact same mutation next sync. A "discard" action is deliberately not built —
 * these rows are financial and household records, and silently offering to abandon one
 * is a bigger decision than this pass should make unasked.
 */
export async function listFailedMutations(): Promise<FailedMutation[]> {
  const db = await openDb();
  return db.select().from(outbox).where(eq(outbox.status, 'failed')).orderBy(outbox.seq);
}

export async function retryFailedMutation(seq: number): Promise<void> {
  const db = await openDb();
  await db.update(outbox).set({ status: 'pending' }).where(eq(outbox.seq, seq));
}
