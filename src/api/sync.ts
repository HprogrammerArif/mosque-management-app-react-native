import type { ApiClient } from './client';

/**
 * Hand-typed against the actual verified response shape (backend commit 50e2bf3's live
 * test), not derived from contract.gen.ts like the rest of this API layer — the sync
 * routes never got a `docs.response` Zod schema on the backend (same class of gap as
 * the three routes fixed in an earlier commit), and bootstrap/push/pull's response
 * shapes are complex enough (nested per-entity records, a four-way result union) that
 * writing accurate Zod schemas for them is real work belonging on the backend, not a
 * blocker for the frontend engine that consumes them.
 */
export type SyncMutationResult =
  | { mutationId: string; status: 'accepted'; serverVersion: number; changeSeq: number; canonical: Record<string, unknown> }
  | { mutationId: string; status: 'duplicate'; serverVersion: number; changeSeq: number; canonical: Record<string, unknown> }
  | { mutationId: string; status: 'rejected'; code: string; message: string };

export type SyncPushResponse = { results: SyncMutationResult[]; cursor: number };

export type SyncPullResponse = {
  changes: Record<string, { rows: Record<string, unknown>[]; cursor: number; hasMore: boolean }>;
  serverTime: string;
};

export type SyncBootstrapResponse = {
  serverTime: string;
  entities: Record<string, { rows: Record<string, unknown>[]; nextPage: string | null; cursor: number; complete: boolean }>;
};

export type SyncMutation = {
  mutationId: string;
  entity: 'donations' | 'households';
  entityId: string;
  op: 'insert' | 'update' | 'delete';
  hlc: string;
  dependsOn: string[];
  payload: Record<string, unknown>;
};

export function syncBootstrap(
  api: ApiClient, mosqueId: string, entities: string[], idempotencyKey: string,
): Promise<SyncBootstrapResponse> {
  return api.post<SyncBootstrapResponse>(
    '/sync/bootstrap', { entities }, { tenantId: mosqueId, idempotencyKey },
  );
}

export function syncPush(
  api: ApiClient, mosqueId: string, deviceId: string, mutations: SyncMutation[], idempotencyKey: string,
): Promise<SyncPushResponse> {
  return api.post<SyncPushResponse>(
    '/sync/push', { deviceId, mutations }, { tenantId: mosqueId, idempotencyKey },
  );
}

export function syncPull(
  api: ApiClient, mosqueId: string, entities: string[], since: number,
): Promise<SyncPullResponse> {
  return api.get<SyncPullResponse>(
    `/sync/pull?entities=${entities.join(',')}&since=${since}`, mosqueId,
  );
}
