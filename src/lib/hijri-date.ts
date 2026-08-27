import umalqura from '@umalqura/core';

export type HijriDate = {
  year: number;
  month: number;
  day: number;
};

const MONTH_NAMES = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

/**
 * `adjustmentDays` is the mosque's local moon-sighting adjustment (design system doc,
 * §"HijriDate": "Hijri with Gregorian, honouring the mosque's adjustment") — real mosques
 * regularly differ from the tabular Umm al-Qura calendar by a day. **Not yet wired to a
 * stored config field** — Phase 2A's PRAYER_CONFIG has no column for it. Exposed as a
 * parameter here (default 0) so the caller can supply one once that field exists, rather
 * than the conversion function silently assuming the tabular calendar is always right.
 */
export function toHijri(date: Date, adjustmentDays = 0): HijriDate {
  const adjusted = adjustmentDays === 0 ? date : new Date(date.getTime() + adjustmentDays * 86_400_000);
  const { hy, hm, hd } = umalqura.$.gregorianToHijri(adjusted);
  return { year: hy, month: hm, day: hd };
}

export function formatHijri(hijri: HijriDate): string {
  return `${hijri.day} ${MONTH_NAMES[hijri.month - 1] ?? ''} ${hijri.year}`.trim();
}
