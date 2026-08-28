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

// Cached the same way as mosques/prayerConfig (sync-mosque.ts's one-shot fetch-then-write)
// — NOT sync-engine-backed like households/donations, since funds are platform-managed
// (seeded at provisioning, essentially read-only from the app's side) rather than
// something a device edits offline. Existing purely so the donation-recording form's
// fund picker still has options with no network: without this table, opening "record
// donation" for the first time in a session while offline left the picker empty, since
// it fetched funds live via REST with no fallback.
export const funds = sqliteTable('funds', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  zakatEligible: integer('zakat_eligible', { mode: 'boolean' }).notNull().default(false),
});

// Households and donations carry sync metadata (offline-sync-protocol.md §4.1):
// serverVersion/changeSeq/hlc are null until the first successful sync ("never
// synced"); dirty/pendingOp track an in-flight local write awaiting acknowledgement.
// No tenantId column yet — see mosques' own note; this device holds one mosque's data
// until Plan 3's multi-tenant sync work is further along than "insert-only, two
// entities" (matches the backend's own current scope, Phase 3A).
export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  addressLine1: text('address_line1'),
  area: text('area'),
  phone: text('phone'),
  monthlyDuesMinor: integer('monthly_dues_minor').notNull().default(0),
  exempt: integer('exempt', { mode: 'boolean' }).notNull().default(false),
  joinedOn: text('joined_on'),
  status: text('status').notNull().default('ACTIVE'),
  serverVersion: integer('server_version'),
  changeSeq: integer('change_seq'),
  hlc: text('hlc'),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
  pendingOp: text('pending_op'),
});

export const donations = sqliteTable('donations', {
  id: text('id').primaryKey(),
  fundId: text('fund_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull().default('BDT'),
  occurredOn: text('occurred_on').notNull(),
  method: text('method').notNull(),
  donorHouseholdId: text('donor_household_id'),
  donorName: text('donor_name'),
  anonymous: integer('anonymous', { mode: 'boolean' }).notNull().default(false),
  receiptNo: text('receipt_no'),
  note: text('note'),
  adjustsId: text('adjusts_id'),
  adjustmentReason: text('adjustment_reason'),
  serverVersion: integer('server_version'),
  changeSeq: integer('change_seq'),
  hlc: text('hlc'),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
  pendingOp: text('pending_op'),
});

// Written in the SAME SQLite transaction as the entity row it queues — durability
// (I1) rests entirely on that, per §4.2. FIFO by `seq` (autoincrement).
export const outbox = sqliteTable('outbox', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  mutationId: text('mutation_id').notNull().unique(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  op: text('op').notNull(),
  payload: text('payload').notNull(),
  hlc: text('hlc').notNull(),
  dependsOn: text('depends_on'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
});

// Per-entity cursor (§4.3) — a schema change to one entity doesn't force a resync of
// the others, and a failure in one doesn't block the rest.
export const syncState = sqliteTable('sync_state', {
  entity: text('entity').primaryKey(),
  cursor: integer('cursor').notNull().default(0),
  bootstrapped: integer('bootstrapped', { mode: 'boolean' }).notNull().default(false),
  lastSyncAt: integer('last_sync_at'),
});
