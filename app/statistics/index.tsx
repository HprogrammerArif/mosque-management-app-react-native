import { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import {
  getIncomeExpenditure, listFundBalanceStats, listDonationTrends,
  type IncomeExpenditureResponse, type FundBalanceStatResponse, type DonationTrendResponse,
} from '../../src/api/money';
import { money, formatMoney } from '../../src/lib/money';

const statsStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[6] },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, minHeight: 32 },
  summaryLabel: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },
  summaryValue: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
  netPositive: { color: t.color.ink },
  netNegative: { color: t.color.brick },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 40, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
  trendBar: { height: 8, borderRadius: t.radius.base, backgroundColor: t.color.ochre, marginTop: t.space[1] },
});

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const s = useStyles(statsStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [summary, setSummary] = useState<IncomeExpenditureResponse | null>(null);
  const [balances, setBalances] = useState<FundBalanceStatResponse[]>([]);
  const [trends, setTrends] = useState<DonationTrendResponse[]>([]);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    const { from, to } = currentMonthRange();
    const [summaryResult, balancesResult, trendsResult] = await Promise.all([
      getIncomeExpenditure(api, mosqueId, from, to),
      listFundBalanceStats(api, mosqueId),
      listDonationTrends(api, mosqueId, 6),
    ]);
    setSummary(summaryResult);
    setBalances(balancesResult);
    setTrends(trendsResult);
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (summary === null) return <View style={s.fill} />;

  const maxTrend = Math.max(1, ...trends.map((point) => Math.abs(point.totalMinor)));

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <View>
        <Text style={s.sectionTitle}>{t('statistics.thisMonth')}</Text>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>{t('statistics.income')}</Text>
          <Text style={s.summaryValue}>{formatMoney(money(summary.incomeMinor, 'BDT'), 'en-IN')}</Text>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>{t('statistics.expenditure')}</Text>
          <Text style={s.summaryValue}>{formatMoney(money(summary.expenditureMinor, 'BDT'), 'en-IN')}</Text>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>{t('statistics.net')}</Text>
          <Text style={[s.summaryValue, summary.netMinor >= 0 ? s.netPositive : s.netNegative]}>
            {formatMoney(money(summary.netMinor, 'BDT'), 'en-IN')}
          </Text>
        </View>
      </View>

      <View>
        <Text style={s.sectionTitle}>{t('statistics.fundBalances')}</Text>
        {balances.map((fund) => (
          <View key={fund.fundId} style={s.row}>
            <Text style={s.name}>{fund.fundName}</Text>
            <Text style={s.amount}>{formatMoney(money(fund.balanceMinor, 'BDT'), 'en-IN')}</Text>
          </View>
        ))}
      </View>

      <View>
        <Text style={s.sectionTitle}>{t('statistics.donationTrends')}</Text>
        {trends.map((point) => (
          <View key={point.period} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{point.period}</Text>
              <View style={[s.trendBar, { width: `${(Math.abs(point.totalMinor) / maxTrend) * 100}%` }]} />
            </View>
            <Text style={s.amount}>{formatMoney(money(point.totalMinor, 'BDT'), 'en-IN')}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
