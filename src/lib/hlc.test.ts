import { localEvent, receiveEvent, compareHlc, serializeHlc, parseHlc, type Hlc } from './hlc';

const clock = (wall: number, counter: number, node = 'A'): Hlc => ({ wall, counter, node });

describe('localEvent', () => {
  it('advances the counter when the wall clock has not moved', () => {
    expect(localEvent(clock(1000, 3), 1000)).toEqual(clock(1000, 4));
  });

  it('resets the counter when now moves the wall clock forward', () => {
    expect(localEvent(clock(1000, 5), 2000)).toEqual(clock(2000, 0));
  });
});

describe('receiveEvent', () => {
  it('takes the max of both counters plus one when both walls tie with now', () => {
    const local = clock(1000, 3, 'A');
    const incoming = clock(1000, 7, 'B');
    expect(receiveEvent(local, incoming, 1000)).toEqual(clock(1000, 8, 'A'));
  });

  it('always keeps the receiver\'s own node, never the sender\'s', () => {
    const local = clock(1000, 0, 'receiver');
    const incoming = clock(9999, 0, 'sender');
    expect(receiveEvent(local, incoming, 0).node).toBe('receiver');
  });

  it('resets the counter when the wall clock (now) outruns both', () => {
    const local = clock(1000, 3, 'A');
    const incoming = clock(1000, 5, 'B');
    expect(receiveEvent(local, incoming, 5000)).toEqual(clock(5000, 0, 'A'));
  });
});

describe('compareHlc', () => {
  it('orders by wall clock, then counter, then node — a total order', () => {
    expect(compareHlc(clock(1000, 0), clock(2000, 0))).toBeLessThan(0);
    expect(compareHlc(clock(1000, 1), clock(1000, 2))).toBeLessThan(0);
    expect(compareHlc(clock(1000, 1, 'A'), clock(1000, 1, 'B'))).toBeLessThan(0);
    expect(compareHlc(clock(1000, 1, 'A'), clock(1000, 1, 'A'))).toBe(0);
  });
});

describe('serializeHlc / parseHlc', () => {
  it('round-trips a clock through serialize/parse', () => {
    const original = clock(1_700_000_000_000, 42, 'device-9');
    expect(parseHlc(serializeHlc(original))).toEqual(original);
  });

  it('zero-pads so lexical string order matches HLC order across a wall-clock jump', () => {
    const earlier = serializeHlc(clock(999, 999999, 'A'));
    const later = serializeHlc(clock(1000, 0, 'A'));
    expect(earlier < later).toBe(true);
  });

  it('throws on a malformed string', () => {
    expect(() => parseHlc('not-a-clock')).toThrow(/Malformed HLC/);
  });
});

/**
 * ADR-0011's duplication discipline names the risk directly: this file must stay
 * byte-for-byte identical to the backend's src/domain/hlc.ts, or the two replicas'
 * merge ordering silently diverges. There's no shared package to enforce that
 * structurally, so this at least pins the observable behaviour both copies must agree
 * on — a future edit to one side that breaks this contract fails here, not in
 * production disagreement between client and server.
 */
describe('client/server HLC parity (ADR-0011)', () => {
  it('produces the same result as the server algorithm for a receiveEvent three-way tie', () => {
    const local = clock(5000, 2, 'client');
    const incoming = clock(5000, 9, 'server');
    expect(receiveEvent(local, incoming, 5000)).toEqual(clock(5000, 10, 'client'));
  });
});
