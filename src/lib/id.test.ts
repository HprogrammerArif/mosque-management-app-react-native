import { newEntityId } from './id';

describe('newEntityId', () => {
  it('returns a well-formed UUID', () => {
    expect(newEntityId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('returns a UUIDv7 (version nibble 7)', () => {
    const id = newEntityId();
    expect(id.charAt(14)).toBe('7');
  });

  it('never repeats across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newEntityId()));
    expect(ids.size).toBe(1000);
  });

  it('sorts lexically in creation order — the whole point of using v7 for offline-created rows', async () => {
    const first = newEntityId();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = newEntityId();
    expect(first < second).toBe(true);
  });
});
