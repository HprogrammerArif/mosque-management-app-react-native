import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession, hasFeature } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { SelectField } from '../../src/components/ui/SelectField';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  createPayrollRun, listPayrollLines, postPayrollRun, listStaff, listFunds,
  type PayrollRunResponse, type PayrollLineResponse, type StaffResponse, type FundResponse,
} from '../../src/api/money';
import { money, formatMoney, type Currency } from '../../src/lib/money';

const runStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  header: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  status: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 44, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  name: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.brick },
  staffLink: { marginTop: t.space[2] },
  lockedCard: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    backgroundColor: t.color.surface, padding: t.space[4], gap: t.space[1],
  },
  lockedTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  lockedBody: { ...t.type.body, fontFamily: t.font.text, color: t.color.stone },
});

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function PayrollRunScreen() {
  const { t } = useTranslation();
  const s = useStyles(runStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const memberships = useSession((state) => state.memberships);
  const payrollEnabled = mosqueId !== null && hasFeature(memberships, mosqueId, 'PAYROLL');
  const [period] = useState(currentPeriod());
  const [run, setRun] = useState<PayrollRunResponse | null>(null);
  const [lines, setLines] = useState<PayrollLineResponse[]>([]);
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [funds, setFunds] = useState<FundResponse[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      const [staffList, fundList] = await Promise.all([listStaff(api, mosqueId), listFunds(api, mosqueId)]);
      setStaff(staffList);
      setFunds(fundList);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onGenerate = async () => {
    if (mosqueId === null || fundId === null) return;
    setGenerating(true);
    try {
      const created = await createPayrollRun(api, mosqueId, { period, fundId }, Crypto.randomUUID());
      setRun(created);
      setLines(await listPayrollLines(api, mosqueId, created.id));
    } finally {
      setGenerating(false);
    }
  };

  const onPost = async () => {
    if (mosqueId === null || run === null) return;
    setPosting(true);
    try {
      const posted = await postPayrollRun(api, mosqueId, run.id, Crypto.randomUUID());
      setRun(posted);
      setLines(await listPayrollLines(api, mosqueId, run.id));
    } finally {
      setPosting(false);
    }
  };

  const staffName = (staffId: string): string => staff.find((m) => m.id === staffId)?.name ?? staffId;

  if (loadError && staff.length === 0 && funds.length === 0) {
    return <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Text style={s.header}>{period}</Text>

        {!payrollEnabled ? (
          <View style={s.lockedCard}>
            <Text style={s.lockedTitle}>{t('payroll.lockedTitle')}</Text>
            <Text style={s.lockedBody}>{t('payroll.lockedBody')}</Text>
          </View>
        ) : run === null ? (
          <>
            <SelectField
              label={t('payroll.fund')}
              value={fundId}
              options={funds.map((f) => ({ value: f.id, label: f.name }))}
              onChange={setFundId}
            />
            <Button label={t('payroll.generate')} onPress={onGenerate} loading={generating} disabled={fundId === null} />
          </>
        ) : (
          <>
            <Text style={s.status}>{t(`payroll.statuses.${run.status}`)}</Text>
            {run.status === 'DRAFT' && (
              <Button label={t('payroll.postToLedger')} onPress={onPost} loading={posting} />
            )}
          </>
        )}

        <View style={s.staffLink}>
          <Button label={t('payroll.manageStaff')} variant="secondary" onPress={() => router.push('/payroll/staff')} />
        </View>
      </View>

      {run !== null && (
        lines.length === 0 ? (
          <EmptyState message={t('payroll.noStaffOnRun')} />
        ) : (
          <FlatList
            contentContainerStyle={s.content}
            data={lines}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={s.row}>
                <Text style={s.name}>{staffName(item.staffId)}</Text>
                <Text style={s.amount}>
                  {formatMoney(money(item.amountMinor, item.currency as Currency))}
                </Text>
              </View>
            )}
          />
        )
      )}
    </View>
  );
}
