import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { getRandomBytes } from 'expo-crypto';
import * as schema from './schema';

const KEY_STORAGE_KEY = 'db_key';

/**
 * Generated once per install, stored in SecureStore (Keystore/Keychain-backed), never
 * transmitted. Losing it means losing the local database — there is no recovery path,
 * which is the correct tradeoff for on-device encryption at rest.
 */
async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
  if (existing !== null) return existing;

  const bytes = getRandomBytes(32);
  const key = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, key);
  return key;
}

/**
 * NOT YET VERIFIED ON DEVICE that `PRAGMA key` actually engages SQLCipher rather than
 * silently no-op'ing against a non-cipher SQLite build — Phase 2B's plan flags this
 * explicitly as the one thing that must be checked empirically, not assumed, before this
 * is trusted with real financial data. Deferred to the end-of-build device pass
 * (standing instruction, 2026-08-27) rather than blocking on it now.
 */
async function open() {
  const key = await getOrCreateKey();

  const sqlite = openDatabaseSync('masjid.db', { enableChangeListener: true });
  sqlite.execSync(`PRAGMA key = '${key}'`);
  sqlite.execSync('PRAGMA journal_mode = WAL');
  sqlite.execSync('PRAGMA foreign_keys = ON');
  sqlite.execSync('PRAGMA synchronous = NORMAL');

  return drizzle(sqlite, { schema });
}

export type Db = Awaited<ReturnType<typeof open>>;

let instance: Promise<Db> | undefined;

/** Memoised — openDatabaseSync should only ever run once per process. */
export function openDb(): Promise<Db> {
  instance ??= open();
  return instance;
}
