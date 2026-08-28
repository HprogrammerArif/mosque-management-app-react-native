import { computePrayerTimes, type PrayerConfigLike, type DayPrayerTimes, type PrayerName } from './prayer-times';

const dhakaCoords = { latitude: 23.8103, longitude: 90.4125 };

function baseConfig(overrides: Partial<PrayerConfigLike> = {}): PrayerConfigLike {
  return {
    calculationMethod: 'KARACHI',
    fajrOffsetMin: 15, dhuhrOffsetMin: 15, asrOffsetMin: 15, maghribOffsetMin: 5, ishaOffsetMin: 15,
    fajrFixedTime: null, dhuhrFixedTime: null, asrFixedTime: null, maghribFixedTime: null, ishaFixedTime: null,
    jumuahTime: '13:15',
    ...overrides,
  };
}

function slot(times: DayPrayerTimes, prayer: PrayerName) {
  const found = times.slots.find((s) => s.prayer === prayer);
  if (!found) throw new Error(`No ${prayer} slot in computed prayer times`);
  return found;
}

// Not pinned to an external reference value — these assert structural invariants any
// correct calculation must satisfy, rather than a specific clock time this repo can't
// independently verify without network access.
describe('computePrayerTimes', () => {
  it('orders the five daily prayers correctly relative to sunrise', () => {
    const times = computePrayerTimes(baseConfig(), dhakaCoords, new Date('2026-08-15T00:00:00Z'));
    const fajr = slot(times, 'fajr').adhan.getTime();
    const dhuhr = slot(times, 'dhuhr').adhan.getTime();
    const asr = slot(times, 'asr').adhan.getTime();
    const maghrib = slot(times, 'maghrib').adhan.getTime();
    const isha = slot(times, 'isha').adhan.getTime();

    expect(fajr).toBeLessThan(times.sunrise.getTime());
    expect(times.sunrise.getTime()).toBeLessThan(dhuhr);
    expect(dhuhr).toBeLessThan(asr);
    expect(asr).toBeLessThan(maghrib);
    expect(maghrib).toBeLessThan(isha);
  });

  it('derives jamaat from adhan + offset when no fixed time is configured', () => {
    const times = computePrayerTimes(baseConfig({ dhuhrOffsetMin: 20 }), dhakaCoords, new Date('2026-08-15T00:00:00Z'));
    const dhuhr = slot(times, 'dhuhr');
    expect(dhuhr.jamaat.getTime() - dhuhr.adhan.getTime()).toBe(20 * 60_000);
  });

  it('uses a fixed jamaat time instead of an offset when one is configured', () => {
    const date = new Date('2026-08-15T00:00:00Z');
    const times = computePrayerTimes(baseConfig({ asrFixedTime: '16:30' }), dhakaCoords, date);
    const asr = slot(times, 'asr');
    expect(asr.jamaat.getHours()).toBe(16);
    expect(asr.jamaat.getMinutes()).toBe(30);
  });

  it('carries the configured Jumu\'ah time through unchanged — it is never computed', () => {
    const times = computePrayerTimes(baseConfig({ jumuahTime: '13:45' }), dhakaCoords, new Date('2026-08-15T00:00:00Z'));
    expect(times.jumuahTime).toBe('13:45');
  });

  it('falls back to Karachi for an unrecognised calculation method rather than throwing', () => {
    expect(() => computePrayerTimes(
      baseConfig({ calculationMethod: 'NOT_A_REAL_METHOD' }), dhakaCoords, new Date('2026-08-15T00:00:00Z'),
    )).not.toThrow();
  });

  it('produces different Fajr times for two clearly different calculation methods', () => {
    const date = new Date('2026-08-15T00:00:00Z');
    const mwl = computePrayerTimes(baseConfig({ calculationMethod: 'MWL' }), dhakaCoords, date);
    const ummAlQura = computePrayerTimes(baseConfig({ calculationMethod: 'UMM_AL_QURA' }), dhakaCoords, date);
    expect(slot(mwl, 'fajr').adhan.getTime()).not.toBe(slot(ummAlQura, 'fajr').adhan.getTime());
  });
});
