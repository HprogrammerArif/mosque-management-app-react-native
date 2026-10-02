import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_install_id';
let cachedDeviceId: string | null = null;

/**
 * Returns a persistent, unique device identifier for this app installation.
 * Generated once, stored in SecureStore, and cached in-memory for zero disk I/O on repeated calls.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId !== null) return cachedDeviceId;

  // Check new key first, then fallback to sync_node_id if already present from previous builds
  let existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing === null) {
    existing = await SecureStore.getItemAsync('sync_node_id');
  }

  if (existing !== null) {
    cachedDeviceId = existing;
    return existing;
  }

  const newId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
}
