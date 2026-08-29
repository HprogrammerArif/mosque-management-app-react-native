import { eq } from 'drizzle-orm';
import { openDb } from './db';
import { mosques, prayerConfig, funds, expenseCategories } from './schema';
import { fetchMosque, fetchPrayerConfig } from '../api/mosques';
import { listFunds, listExpenseCategories } from '../api/money';
import type { ApiClient } from '../api/client';

/**
 * One-shot fetch-then-write, run right after sign-in and on manual refresh. Not a sync
 * engine — that's Plan 3's /sync/pull machinery — just enough for prayer times to work
 * offline after the first successful fetch. Overwrites wholesale rather than merging:
 * this device is the only writer of its own cache, so there's nothing to reconcile yet.
 */
export async function syncMosqueConfig(api: ApiClient, mosqueId: string): Promise<void> {
  const [mosque, config] = await Promise.all([
    fetchMosque(api, mosqueId),
    fetchPrayerConfig(api, mosqueId),
  ]);

  const db = await openDb();

  await db.insert(mosques).values({
    id: mosque.id,
    name: mosque.name,
    timezone: mosque.timezone,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  }).onConflictDoUpdate({
    target: mosques.id,
    set: {
      name: mosque.name, timezone: mosque.timezone,
      latitude: mosque.latitude, longitude: mosque.longitude,
    },
  });

  await db.insert(prayerConfig).values({
    mosqueId: config.tenantId,
    calculationMethod: config.calculationMethod,
    fajrOffsetMin: config.fajrOffsetMin,
    dhuhrOffsetMin: config.dhuhrOffsetMin,
    asrOffsetMin: config.asrOffsetMin,
    maghribOffsetMin: config.maghribOffsetMin,
    ishaOffsetMin: config.ishaOffsetMin,
    fajrFixedTime: config.fajrFixedTime,
    dhuhrFixedTime: config.dhuhrFixedTime,
    asrFixedTime: config.asrFixedTime,
    maghribFixedTime: config.maghribFixedTime,
    ishaFixedTime: config.ishaFixedTime,
    jumuahTime: config.jumuahTime,
  }).onConflictDoUpdate({
    target: prayerConfig.mosqueId,
    set: {
      calculationMethod: config.calculationMethod,
      fajrOffsetMin: config.fajrOffsetMin, dhuhrOffsetMin: config.dhuhrOffsetMin,
      asrOffsetMin: config.asrOffsetMin, maghribOffsetMin: config.maghribOffsetMin,
      ishaOffsetMin: config.ishaOffsetMin,
      fajrFixedTime: config.fajrFixedTime, dhuhrFixedTime: config.dhuhrFixedTime,
      asrFixedTime: config.asrFixedTime, maghribFixedTime: config.maghribFixedTime,
      ishaFixedTime: config.ishaFixedTime, jumuahTime: config.jumuahTime,
    },
  });
}

/**
 * Same one-shot fetch-then-write shape as syncMosqueConfig, for the same reason:
 * funds are effectively read-only from the app's side (seeded at provisioning), so
 * there's nothing to reconcile — just overwrite wholesale. Without this, the donation
 * form's fund picker has no options the first time it's opened offline in a session.
 */
export async function syncFunds(api: ApiClient, mosqueId: string): Promise<void> {
  const rows = await listFunds(api, mosqueId);
  const db = await openDb();

  for (const fund of rows) {
    await db.insert(funds).values({
      id: fund.id, type: fund.type, name: fund.name, zakatEligible: fund.zakatEligible,
    }).onConflictDoUpdate({
      target: funds.id,
      set: { type: fund.type, name: fund.name, zakatEligible: fund.zakatEligible },
    });
  }
}

export async function getCachedFunds() {
  const db = await openDb();
  return db.select().from(funds);
}

/** Same shape as syncFunds/getCachedFunds — expense categories are equally platform-managed. */
export async function syncExpenseCategories(api: ApiClient, mosqueId: string): Promise<void> {
  const rows = await listExpenseCategories(api, mosqueId);
  const db = await openDb();

  for (const category of rows) {
    await db.insert(expenseCategories).values({
      id: category.id, name: category.name, zakatEligible: category.zakatEligible,
    }).onConflictDoUpdate({
      target: expenseCategories.id,
      set: { name: category.name, zakatEligible: category.zakatEligible },
    });
  }
}

export async function getCachedExpenseCategories() {
  const db = await openDb();
  return db.select().from(expenseCategories);
}

export async function getCachedMosque(mosqueId: string) {
  const db = await openDb();
  const rows = await db.select().from(mosques).where(eq(mosques.id, mosqueId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Until Plan 3's sync makes multi-tenant local storage real, a device holds at most one
 * mosque's data — so "is there a row at all" is a valid, fully offline way to resolve
 * which mosque the home screen should show on every launch after the first.
 */
export async function getAnyCachedMosque() {
  const db = await openDb();
  const rows = await db.select().from(mosques).limit(1);
  return rows[0] ?? null;
}

export async function getCachedPrayerConfig(mosqueId: string) {
  const db = await openDb();
  const rows = await db.select().from(prayerConfig).where(eq(prayerConfig.mosqueId, mosqueId)).limit(1);
  return rows[0] ?? null;
}
