import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const mosques = sqliteTable('mosques', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
});

// Mirrors the backend's PRAYER_CONFIG shape (Phase 2A Task 7) — kept in sync by hand,
// same ADR-0011 duplication discipline as Money. Fixed-time columns win over offsets
// when present; no mode flag, since a mosque can mix modes per prayer.
export const prayerConfig = sqliteTable('prayer_config', {
  mosqueId: text('mosque_id').primaryKey().references(() => mosques.id),
  calculationMethod: text('calculation_method').notNull(),
  fajrOffsetMin: integer('fajr_offset_min').notNull().default(0),
  dhuhrOffsetMin: integer('dhuhr_offset_min').notNull().default(0),
  asrOffsetMin: integer('asr_offset_min').notNull().default(0),
  maghribOffsetMin: integer('maghrib_offset_min').notNull().default(0),
  ishaOffsetMin: integer('isha_offset_min').notNull().default(0),
  fajrFixedTime: text('fajr_fixed_time'),
  dhuhrFixedTime: text('dhuhr_fixed_time'),
  asrFixedTime: text('asr_fixed_time'),
  maghribFixedTime: text('maghrib_fixed_time'),
  ishaFixedTime: text('isha_fixed_time'),
  jumuahTime: text('jumuah_time'),
});
