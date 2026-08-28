import { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  listDuesChargesByPeriod, generateDues, listHouseholds,
  type DuesChargeResponse, type HouseholdResponse,
} from '../../src/api/money';
import { money, formatMoney, type Currency } from '../../src/lib/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  header: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 48, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  rowLeft: { flex: 1 },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  status: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.brick },
});

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DuesList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [period] = useState(currentPeriod());
  const [charges, setCharges] = useState<DuesChargeResponse[] | null>(null);
  const [households, setHouseholds] = useState<HouseholdResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    const [chargeList, householdList] = await Promise.all([
      listDuesChargesByPeriod(api, mosqueId, period),
      listHouseholds(api, mosqueId),
    ]);
    setCharges(chargeList);
    setHouseholds(householdList);
  }, [mosqueId, period]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onGenerate = async () => {
    if (mosqueId === null) return;
    setGenerating(true);
    try {
      await generateDues(api, mosqueId, { period }, Crypto.randomUUID());
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const householdName = (householdId: string): string =>
    households.find((h) => h.id === householdId)?.name ?? householdId;

  if (charges === null) return <View style={s.fill} />;

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Text style={s.header}>{period}</Text>
        <Button label={t('dues.generate')} onPress={onGenerate} loading={generating} />
      </View>

      {charges.length === 0 ? (
        <EmptyState message={t('dues.empty')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={charges}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable
              style={s.row}
              onPress={() => router.push(`/dues/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={householdName(item.householdId)}
            >
              <View style={s.rowLeft}>
                <Text style={s.name}>{householdName(item.householdId)}</Text>
                <Text style={s.status}>{t(`dues.statuses.${item.status}`)}</Text>
              </View>
              <Text style={s.amount}>
                {formatMoney(money(item.amountMinor - item.paidMinor, item.currency as Currency), 'en-IN')}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
