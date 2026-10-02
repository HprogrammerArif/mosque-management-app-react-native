import { money, formatMoney, type Currency } from '../lib/money';

/**
 * Just the fields the summary needs, not the full outbox row shape — kept independent
 * of sync-engine.ts/db.ts on purpose. Importing schema.ts's inferred row type here would
 * pull the whole SQLite/migrations import chain into anything that imports this file,
 * including its own test (Jest has no way to parse the raw .sql migration files Metro
 * handles via the custom `sql` resolver extension — the same expo-sqlite testing gap
 * named in sync-triggers.ts and db.ts).
 */
export type SummarizableOutboxRow = {
  entity: string;
  entityId: string;
  payload: string;
};

/** Best-effort human summary from the outbox row's own saved payload — no join needed. */
export function summarizeOutboxRow(row: SummarizableOutboxRow): string {
  try {
    const payload = JSON.parse(row.payload) as Record<string, unknown>;
    if (row.entity === 'households') return String(payload['name'] ?? row.entityId);
    if (row.entity === 'donations') {
      const amountMinor = payload['amountMinor'];
      const currency = payload['currency'];
      if (typeof amountMinor === 'number' && typeof currency === 'string') {
        return formatMoney(money(amountMinor, currency as Currency));
      }
    }
  } catch {
    // Malformed payload shouldn't happen — fall through to the generic label below.
  }
  return row.entityId;
}
