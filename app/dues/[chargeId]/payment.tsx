import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../../src/theme/use-styles';
import type { Theme } from '../../../src/theme/tokens';
import { api } from '../../../src/stores/session';
import { useMosque } from '../../../src/stores/mosque';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { SelectField } from '../../../src/components/ui/SelectField';
import { listFunds, recordDuesPayment, type FundResponse } from '../../../src/api/money';
import { ApiError } from '../../../src/api/client';

const DUES_PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'CHEQUE'] as const;

const formStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[2] },
  errorBox: {
    marginBottom: t.space[4], borderRadius: t.radius.base, borderWidth: 1,
    borderColor: t.color.brick, backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordDuesPayment() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const { chargeId } = useLocalSearchParams<{ chargeId: string }>();
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [funds, setFunds] = useState<FundResponse[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [method, setMethod] = useState<string | null>('CASH');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mosqueId === null) return;
    void listFunds(api, mosqueId).then(setFunds);
  }, [mosqueId]);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || fundId === null || method === null) return;
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordDuesPayment(api, mosqueId, chargeId, {
        fundId,
        amountMinor,
        currency: 'BDT',
        paidOn,
        method: method as typeof DUES_PAYMENT_METHODS[number],
        collectedBy: null,
      }, Crypto.randomUUID());
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RULE_DUES_OVERPAYMENT') {
        setError(t('dues.errors.RULE_DUES_OVERPAYMENT'));
      } else if (err instanceof ApiError && err.code === 'RULE_DUES_ALREADY_SETTLED') {
        setError(t('dues.errors.RULE_DUES_ALREADY_SETTLED'));
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <SelectField
        label={t('expenses.fund')}
        value={fundId}
        options={funds.map((f) => ({ value: f.id, label: f.name }))}
        onChange={setFundId}
      />
      <Input label={t('common.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Input label={t('common.date')} value={paidOn} onChangeText={setPaidOn} />
      <SelectField
        label={t('common.method')}
        value={method}
        options={DUES_PAYMENT_METHODS.map((m) => ({ value: m, label: t(`common.methods.${m}`) }))}
        onChange={setMethod}
      />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button
        label={t('common.save')}
        onPress={handleSave}
        loading={saving}
        disabled={fundId === null || amount === ''}
      />
    </ScrollView>
  );
}
