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
import {
  listFunds, listExpenseCategories, recordExpense,
  type FundResponse, type ExpenseCategoryResponse,
} from '../../src/api/money';
import { ApiError } from '../../src/api/client';

const EXPENSE_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'CHEQUE', 'IN_KIND'] as const;

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

export default function RecordExpense() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [funds, setFunds] = useState<FundResponse[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [method, setMethod] = useState<string | null>('CASH');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mosqueId === null) return;
    void listFunds(api, mosqueId).then(setFunds);
    void listExpenseCategories(api, mosqueId).then(setCategories);
  }, [mosqueId]);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || fundId === null || categoryId === null || method === null) return;
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordExpense(api, mosqueId, {
        fundId,
        categoryId,
        amountMinor,
        currency: 'BDT',
        occurredOn,
        method: method as typeof EXPENSE_METHODS[number],
        payee: payee === '' ? null : payee,
        description: description === '' ? null : description,
      }, Crypto.randomUUID());
      router.back();
    } catch (err) {
      // BR-1/BR-2's rejections are exactly the message this screen exists to surface
      // clearly — never the raw server text, same discipline as sign-in's error mapping.
      if (err instanceof ApiError && err.code === 'RULE_FUND_RESTRICTION_VIOLATED') {
        setError(t('expenses.errors.RULE_FUND_RESTRICTION_VIOLATED'));
      } else if (err instanceof ApiError && err.code === 'RULE_WAQF_CORPUS_PROTECTED') {
        setError(t('expenses.errors.RULE_WAQF_CORPUS_PROTECTED'));
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
      <SelectField
        label={t('expenses.category')}
        value={categoryId}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        onChange={setCategoryId}
      />
      <Input label={t('common.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Input label={t('common.date')} value={occurredOn} onChangeText={setOccurredOn} />
      <SelectField
        label={t('common.method')}
        value={method}
        options={EXPENSE_METHODS.map((m) => ({ value: m, label: t(`common.methods.${m}`) }))}
        onChange={setMethod}
      />
      <Input label={t('expenses.payee')} value={payee} onChangeText={setPayee} />
      <Input label={t('expenses.description')} value={description} onChangeText={setDescription} />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button
        label={t('common.save')}
        onPress={handleSave}
        loading={saving}
        disabled={fundId === null || categoryId === null || amount === ''}
      />
    </ScrollView>
  );
}
