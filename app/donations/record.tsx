import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SelectField } from '../../src/components/ui/SelectField';
import { listFunds, recordDonation, type FundResponse } from '../../src/api/money';
import { ApiError } from '../../src/api/client';

const DONATION_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'CHEQUE', 'IN_KIND'] as const;

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

export default function RecordDonation() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [funds, setFunds] = useState<FundResponse[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [method, setMethod] = useState<string | null>('CASH');
  const [donorName, setDonorName] = useState('');
  const [note, setNote] = useState('');
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
      await recordDonation(api, mosqueId, {
        fundId,
        amountMinor,
        currency: 'BDT',
        occurredOn,
        method: method as typeof DONATION_METHODS[number],
        donorHouseholdId: null,
        donorName: donorName === '' ? null : donorName,
        anonymous: false,
        receiptNo: null,
        note: note === '' ? null : note,
      }, Crypto.randomUUID());
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <SelectField
        label={t('donations.fund')}
        value={fundId}
        options={funds.map((f) => ({ value: f.id, label: f.name }))}
        onChange={setFundId}
      />
      <Input label={t('common.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Input label={t('common.date')} value={occurredOn} onChangeText={setOccurredOn} />
      <SelectField
        label={t('common.method')}
        value={method}
        options={DONATION_METHODS.map((m) => ({ value: m, label: t(`common.methods.${m}`) }))}
        onChange={setMethod}
      />
      <Input label={t('donations.donorName')} value={donorName} onChangeText={setDonorName} />
      <Input label={t('common.note')} value={note} onChangeText={setNote} />

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
