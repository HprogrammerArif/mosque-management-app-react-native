import { eq } from 'drizzle-orm';
import { openDb } from './db';
import { mosques, prayerConfig } from './schema';
import { fetchMosque, fetchPrayerConfig } from '../api/mosques';
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
