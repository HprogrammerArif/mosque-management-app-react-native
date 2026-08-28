/**
 * Hybrid Logical Clock — client copy. Algorithm must be byte-for-byte identical to the
 * backend's src/domain/hlc.ts (ADR-0011 duplication discipline, same as Money) — a
 * divergent implementation would break the deterministic ordering both replicas depend
 * on for convergence (offline-sync-protocol.md §3, invariant I3).
 */
export type Hlc = { wall: number; counter: number; node: string };

export function localEvent(clock: Hlc, now: number): Hlc {
  const wall = Math.max(clock.wall, now);
  const counter = wall === clock.wall ? clock.counter + 1 : 0;
  return { wall, counter, node: clock.node };
}

export function receiveEvent(clock: Hlc, incoming: Hlc, now: number): Hlc {
  const wall = Math.max(clock.wall, incoming.wall, now);
  let counter: number;
  if (wall === clock.wall && wall === incoming.wall) {
    counter = Math.max(clock.counter, incoming.counter) + 1;
  } else if (wall === clock.wall) {
    counter = clock.counter + 1;
  } else if (wall === incoming.wall) {
    counter = incoming.counter + 1;
  } else {
    counter = 0;
  }
  return { wall, counter, node: clock.node };
}

export function compareHlc(a: Hlc, b: Hlc): number {
  return a.wall - b.wall || a.counter - b.counter || a.node.localeCompare(b.node);
}

export function serializeHlc(clock: Hlc): string {
  return `${clock.wall.toString().padStart(15, '0')}:${clock.counter.toString().padStart(6, '0')}:${clock.node}`;
}

export function parseHlc(serialized: string): Hlc {
  const [wall, counter, node] = serialized.split(':');
  if (wall === undefined || counter === undefined || node === undefined) {
    throw new Error(`Malformed HLC: ${serialized}`);
  }
  return { wall: Number(wall), counter: Number(counter), node };
}
