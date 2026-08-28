import { summarizeOutboxRow, type SummarizableOutboxRow } from './summarize-outbox-row';

function row(overrides: Partial<SummarizableOutboxRow>): SummarizableOutboxRow {
  return { entity: 'households', entityId: 'e1', payload: '{}', ...overrides };
}

describe('summarizeOutboxRow', () => {
  it('shows the household name from its saved payload', () => {
    const item = row({ entity: 'households', payload: JSON.stringify({ name: 'Rahman Household' }) });
    expect(summarizeOutboxRow(item)).toBe('Rahman Household');
  });

  it('formats a donation amount from its saved payload', () => {
    const item = row({
      entity: 'donations', entityId: 'd1',
      payload: JSON.stringify({ amountMinor: 50000, currency: 'BDT' }),
    });
    expect(summarizeOutboxRow(item)).toContain('500');
  });

  it('falls back to the entity id for a malformed payload', () => {
    const item = row({ entity: 'donations', entityId: 'd2', payload: 'not json' });
    expect(summarizeOutboxRow(item)).toBe('d2');
  });

  it('falls back to the entity id when a donation payload is missing amount fields', () => {
    const item = row({ entity: 'donations', entityId: 'd3', payload: '{}' });
    expect(summarizeOutboxRow(item)).toBe('d3');
  });

  it('falls back to the entity id for a household payload missing a name', () => {
    const item = row({ entity: 'households', entityId: 'h1', payload: '{}' });
    expect(summarizeOutboxRow(item)).toBe('h1');
  });
});
