import { toHijri, formatHijri } from './hijri-date';

// Not pinned to an externally-verified Gregorian↔Hijri reference pair (this repo can't
// check one without network access) — these assert structural invariants of the
// conversion and the adjustmentDays parameter instead.
describe('toHijri', () => {
  it('returns a month in 1-12 and a day in 1-30', () => {
    const hijri = toHijri(new Date('2026-08-15T00:00:00Z'));
    expect(hijri.month).toBeGreaterThanOrEqual(1);
    expect(hijri.month).toBeLessThanOrEqual(12);
    expect(hijri.day).toBeGreaterThanOrEqual(1);
    expect(hijri.day).toBeLessThanOrEqual(30);
  });

  it('advances the Hijri date as the Gregorian date advances', () => {
    const day1 = toHijri(new Date('2026-08-15T00:00:00Z'));
    const day2 = toHijri(new Date('2026-08-16T00:00:00Z'));
    const asOrdinal = (h: { year: number; month: number; day: number }) => h.year * 400 + h.month * 31 + h.day;
    expect(asOrdinal(day2)).toBeGreaterThan(asOrdinal(day1));
  });

  it('shifts the result forward by the moon-sighting adjustment', () => {
    const date = new Date('2026-08-15T00:00:00Z');
    const unadjusted = toHijri(date, 0);
    const adjusted = toHijri(date, 1);
    // Either the day rolls forward by 1, or (at a month boundary) the month/day resets —
    // either way the adjusted date must not be the same calendar day.
    const same = unadjusted.year === adjusted.year
      && unadjusted.month === adjusted.month && unadjusted.day === adjusted.day;
    expect(same).toBe(false);
  });

  it('a zero adjustment is a no-op', () => {
    const date = new Date('2026-08-15T00:00:00Z');
    expect(toHijri(date, 0)).toEqual(toHijri(date));
  });
});

describe('formatHijri', () => {
  it('includes the day, a known month name, and the year', () => {
    const formatted = formatHijri({ year: 1448, month: 1, day: 5 });
    expect(formatted).toContain('5');
    expect(formatted).toContain('Muharram');
    expect(formatted).toContain('1448');
  });

  it('handles every month index without producing an empty name', () => {
    for (let month = 1; month <= 12; month += 1) {
      expect(formatHijri({ year: 1448, month, day: 1 })).not.toMatch(/undefined/);
    }
  });
});
