import { CalculationMethod, Coordinates, PrayerTimes as AdhanPrayerTimes } from 'adhan';
import type { PrayerConfigResponse } from '../api/mosques';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerSlot = {
  prayer: PrayerName;
  adhan: Date;
  jamaat: Date;
};

export type DayPrayerTimes = {
  date: Date;
  sunrise: Date;
  slots: PrayerSlot[];
  /** Fixed, never computed — Friday has one congregational time, not five. */
  jumuahTime: string | null;
};

const METHODS: Record<string, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
  MWL: CalculationMethod.MuslimWorldLeague,
  EGYPT: CalculationMethod.Egyptian,
  KARACHI: CalculationMethod.Karachi,
  UMM_AL_QURA: CalculationMethod.UmmAlQura,
  DUBAI: CalculationMethod.Dubai,
  MOONSIGHTING: CalculationMethod.MoonsightingCommittee,
  NORTH_AMERICA: CalculationMethod.NorthAmerica,
  KUWAIT: CalculationMethod.Kuwait,
  QATAR: CalculationMethod.Qatar,
  SINGAPORE: CalculationMethod.Singapore,
  TEHRAN: CalculationMethod.Tehran,
  TURKEY: CalculationMethod.Turkey,
};

/** Parses "HH:MM" onto the calendar day of `on`, in local time. */
function fixedTimeOn(hhmm: string, on: Date): Date {
  const [hoursStr, minutesStr] = hhmm.split(':');
  const result = new Date(on);
  result.setHours(Number(hoursStr), Number(minutesStr), 0, 0);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function computePrayerTimes(
  config: PrayerConfigResponse,
  coords: { latitude: number; longitude: number },
  date: Date,
): DayPrayerTimes {
  const methodFactory = METHODS[config.calculationMethod] ?? CalculationMethod.Karachi;
  const params = methodFactory();
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const raw = new AdhanPrayerTimes(coordinates, date, params);

  const jamaatFor = (
    adhanTime: Date, offsetMin: number, fixedTime: string | null,
  ): Date => (fixedTime !== null ? fixedTimeOn(fixedTime, date) : addMinutes(adhanTime, offsetMin));

  const slots: PrayerSlot[] = [
    { prayer: 'fajr', adhan: raw.fajr, jamaat: jamaatFor(raw.fajr, config.fajrOffsetMin, config.fajrFixedTime) },
    { prayer: 'dhuhr', adhan: raw.dhuhr, jamaat: jamaatFor(raw.dhuhr, config.dhuhrOffsetMin, config.dhuhrFixedTime) },
    { prayer: 'asr', adhan: raw.asr, jamaat: jamaatFor(raw.asr, config.asrOffsetMin, config.asrFixedTime) },
    { prayer: 'maghrib', adhan: raw.maghrib, jamaat: jamaatFor(raw.maghrib, config.maghribOffsetMin, config.maghribFixedTime) },
    { prayer: 'isha', adhan: raw.isha, jamaat: jamaatFor(raw.isha, config.ishaOffsetMin, config.ishaFixedTime) },
  ];

  return { date, sunrise: raw.sunrise, slots, jumuahTime: config.jumuahTime };
}
