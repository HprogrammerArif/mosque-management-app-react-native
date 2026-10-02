import { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { listExpenses, type ExpenseResponse } from '../../src/api/money';
import { money, formatMoney, type Currency } from '../../src/lib/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 48, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  rowLeft: { flex: 1 },
  payee: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  date: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.brick },
});

export default function ExpensesList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [expenses, setExpenses] = useState<ExpenseResponse[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      const result = await listExpenses(api, mosqueId);
      setExpenses(result);
      setLoadError(false);
    } catch {
      // Leave any already-loaded list on screen (a failed background refresh isn't
      // worth blocking on); only the empty/first-load state below reacts to this.
      setLoadError(true);
    }
  }, [mosqueId]);

  // See donations/index.tsx's note — useFocusEffect alone covers mount + every return.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (expenses === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : <View style={s.fill} />;
  }

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('expenses.record')} onPress={() => router.push('/expenses/record')} />
      </View>

      {expenses.length === 0 ? (
        <EmptyState message={t('expenses.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.payee}>{item.payee ?? item.description ?? '—'}</Text>
                <Text style={s.date}>{item.occurredOn}</Text>
              </View>
              <Text style={s.amount}>
                {formatMoney(money(item.amountMinor, item.currency as Currency))}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
