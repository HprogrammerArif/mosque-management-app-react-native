import { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import { useTheme } from '../../src/theme/ThemeProvider';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BottomNav } from '../../src/components/ui/BottomNav';
import {
  getIncomeExpenditure, listFundBalanceStats, listDonationTrends,
  type IncomeExpenditureResponse, type FundBalanceStatResponse, type DonationTrendResponse,
} from '../../src/api/money';
import { money, formatMoney } from '../../src/lib/money';

const statsStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[6] },
  loadingBox: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: t.color.paper, gap: t.space[3] },
  loadingText: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sheet,
    padding: t.space[4],
    borderWidth: 1,
    borderColor: t.color.surface,
    gap: t.space[3],
  },
  sectionTitle: { ...t.type.heading, fontFamily: t.font.textSemi, color: t.color.ink },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, minHeight: 32 },
  summaryLabel: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },
  summaryValue: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
  netCard: {
    backgroundColor: t.color.paper,
    padding: t.space[3],
    borderRadius: t.radius.base,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: t.space[1],
  },
  netPositive: { color: t.color.verdigris },
  netNegative: { color: t.color.brick },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 44, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.paper, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
  trendCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.base,
    padding: t.space[3],
    gap: t.space[2],
    marginBottom: t.space[2],
  },
  trendHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  trendTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: t.color.paper,
    overflow: 'hidden' as const,
  },
  trendBar: {
    height: '100%' as const,
    borderRadius: 5,
    backgroundColor: t.color.verdigris,
  },
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
  const theme = useTheme();
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [summary, setSummary] = useState<IncomeExpenditureResponse | null>(null);
  const [balances, setBalances] = useState<FundBalanceStatResponse[]>([]);
  const [trends, setTrends] = useState<DonationTrendResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    const { from, to } = currentMonthRange();
    try {
      const [summaryResult, balancesResult, trendsResult] = await Promise.all([
        getIncomeExpenditure(api, mosqueId, from, to),
        listFundBalanceStats(api, mosqueId),
        listDonationTrends(api, mosqueId, 6),
      ]);
      setSummary(summaryResult);
      setBalances(balancesResult);
      setTrends(trendsResult);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (summary === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={theme.color.verdigris} />
          <Text style={s.loadingText}>{t('common.loading', { defaultValue: 'Loading analytics...' })}</Text>
        </View>
      );
  }

  const maxTrend = Math.max(1, ...trends.map((point) => Math.abs(point.totalMinor)));

  return (
    <View style={s.fill}>
      <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Text style={s.sectionTitle}>{t('statistics.thisMonth')}</Text>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>{t('statistics.income')}</Text>
          <Text style={s.summaryValue}>{formatMoney(money(summary.incomeMinor, 'BDT'))}</Text>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>{t('statistics.expenditure')}</Text>
          <Text style={s.summaryValue}>{formatMoney(money(summary.expenditureMinor, 'BDT'))}</Text>
        </View>
        <View style={s.netCard}>
          <Text style={s.summaryLabel}>{t('statistics.net')}</Text>
          <Text style={[s.summaryValue, summary.netMinor >= 0 ? s.netPositive : s.netNegative]}>
            {summary.netMinor > 0 ? '+' : ''}{formatMoney(money(summary.netMinor, 'BDT'))}
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>{t('statistics.fundBalances')}</Text>
        {balances.length === 0 ? (
          <Text style={s.summaryLabel}>{t('common.noData', { defaultValue: 'No fund balances recorded' })}</Text>
        ) : (
          balances.map((fund) => (
            <View key={fund.fundId} style={s.row}>
              <Text style={s.name}>{fund.fundName}</Text>
              <Text style={s.amount}>{formatMoney(money(fund.balanceMinor, 'BDT'))}</Text>
            </View>
          ))
        )}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>{t('statistics.donationTrends')}</Text>
        {trends.length === 0 ? (
          <Text style={s.summaryLabel}>{t('common.noData', { defaultValue: 'No trend data recorded' })}</Text>
        ) : (
          trends.map((point) => {
            const pct = Math.min(100, Math.round((Math.abs(point.totalMinor) / maxTrend) * 100));
            return (
              <View key={point.period} style={s.trendCard}>
                <View style={s.trendHeader}>
                  <Text style={s.name}>{point.period}</Text>
                  <Text style={s.amount}>{formatMoney(money(point.totalMinor, 'BDT'))}</Text>
                </View>
                <View style={s.trendTrack}>
                  <View style={[s.trendBar, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })
        )}
      </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

