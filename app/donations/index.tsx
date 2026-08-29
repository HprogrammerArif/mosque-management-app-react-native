import { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { desc } from 'drizzle-orm';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { openDb } from '../../src/data/db';
import { donations as donationsTable } from '../../src/data/schema';
import { runSync } from '../../src/data/sync-engine';
import { money, formatMoney, type Currency } from '../../src/lib/money';

type LocalDonation = typeof donationsTable.$inferSelect;

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 48, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  rowLeft: { flex: 1 },
  donor: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  date: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
  pending: { color: t.color.ochre },
});

/**
 * Reads local SQLite, not the REST API — a donation recorded offline (data/sync-
 * engine.ts's recordDonationOffline) lives here immediately, before it has ever
 * reached the server. Reading from the API instead would mean the user doesn't see
 * their own just-recorded donation until sync completes, which defeats the entire
 * point of offline-first recording.
 */
async function loadLocalDonations(): Promise<LocalDonation[]> {
  const db = await openDb();
  return db.select().from(donationsTable).orderBy(desc(donationsTable.occurredOn));
}

export default function DonationsList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [donations, setDonations] = useState<LocalDonation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setDonations(await loadLocalDonations());
  }, []);

  // useFocusEffect alone covers both the initial mount and every return to this screen —
  // a plain useEffect calling the same load() would be redundant (and re-triggers
  // eslint-plugin-react-hooks's set-state-in-effect rule for no benefit).
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    if (mosqueId !== null) await runSync(api, mosqueId);
    await load();
    setRefreshing(false);
  };

  if (donations === null) return <View style={s.fill} />;

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('donations.record')} onPress={() => router.push('/donations/record')} />
      </View>

      {donations.length === 0 ? (
        <EmptyState message={t('donations.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={donations}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.donor}>{item.anonymous ? t('donations.anonymousDonor') : item.donorName ?? '—'}</Text>
                <Text style={[s.date, item.dirty && s.pending]}>
                  {item.occurredOn}{item.dirty ? ` · ${t('common.pending')}` : ''}
                </Text>
              </View>
              <Text style={s.amount}>
                {formatMoney(money(item.amountMinor, item.currency as Currency), 'en-IN')}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
