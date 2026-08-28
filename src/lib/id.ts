import { uuidv7 } from 'uuidv7';

/**
 * Client-assigned identity (offline-sync-protocol.md §2.1) — every syncable row's ID is
 * generated here, on-device, at creation time, so an offline-created row can be
 * referenced by another offline-created row before either has ever reached the server.
 * uuidv7 falls back to Math.random() if crypto.getRandomValues isn't available rather
 * than throwing — not yet verified which path this environment actually takes (that's
 * a device check, deferred per the standing instruction), but it degrades rather than
 * crashes either way.
 */
export function newEntityId(): string {
  return uuidv7();
}
