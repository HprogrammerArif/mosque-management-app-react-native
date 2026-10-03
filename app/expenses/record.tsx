import { useEffect, useState } from 'react';
import { View, Text, Pressable, Share } from 'react-native';
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
import { KeyboardAwareScrollView } from '../../src/components/ui/KeyboardAwareScrollView';
import { recordExpense } from '../../src/api/money';
import { getCachedFunds, getCachedExpenseCategories, getCachedMosque } from '../../src/data/sync-mosque';
import { ApiError } from '../../src/api/client';
import { money, formatMoney } from '../../src/lib/money';

type CachedOption = { id: string; name: string };

const EXPENSE_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'CHEQUE', 'IN_KIND'] as const;
const PRESET_AMOUNTS = [200, 500, 1000, 2000, 5000];

const formStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3], paddingBottom: t.space[10] },
  label: { ...t.type.label, fontFamily: t.font.sign, textTransform: 'uppercase' as const, color: t.color.stone, marginBottom: 2 },
  presetRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: t.space[2],
    marginBottom: t.space[2],
  },
  presetChip: {
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[2],
    borderRadius: t.radius.base,
    borderWidth: 1,
    borderColor: t.color.stone,
    backgroundColor: t.color.surface,
  },
  presetChipActive: {
    borderColor: t.color.verdigris,
    backgroundColor: t.color.verdigris,
  },
  presetText: {
    ...t.type.body,
    fontFamily: t.font.ledger,
    color: t.color.ink,
  },
  presetTextActive: {
    color: t.color.paper,
    fontFamily: t.font.ledger,
  },
  errorBox: {
    marginBottom: t.space[4], borderRadius: t.radius.base, borderWidth: 1,
    borderColor: t.color.brick, backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },

  // Voucher Confirmation Card
  voucherCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sheet,
    padding: t.space[5],
    gap: t.space[4],
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: t.color.verdigris,
    marginVertical: t.space[4],
  },
  voucherBadge: {
    ...t.type.label,
    fontFamily: t.font.sign,
    textTransform: 'uppercase' as const,
    color: t.color.verdigris,
    letterSpacing: 1,
  },
  voucherAmount: {
    ...t.type.ledgerHero,
    fontFamily: t.font.ledger,
    color: t.color.brick,
  },
  voucherDetail: {
    ...t.type.body,
    fontFamily: t.font.text,
    color: t.color.stone,
    textAlign: 'center' as const,
  },
  voucherActions: {
    width: '100%' as const,
    gap: t.space[2],
    marginTop: t.space[2],
  },
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordExpense() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [funds, setFunds] = useState<CachedOption[]>([]);
  const [categories, setCategories] = useState<CachedOption[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [method, setMethod] = useState<string | null>('CASH');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mosqueName, setMosqueName] = useState('');
  const [lastVoucher, setLastVoucher] = useState<{
    amount: number;
    payee: string;
    category: string;
    fund: string;
    occurredOn: string;
    method: string;
  } | null>(null);

  useEffect(() => {
    void getCachedFunds().then((loaded) => {
      setFunds(loaded);
      if (loaded.length > 0 && fundId === null) {
        setFundId(loaded[0]?.id ?? null);
      }
    });
    void getCachedExpenseCategories().then((loaded) => {
      setCategories(loaded);
      if (loaded.length > 0 && categoryId === null) {
        setCategoryId(loaded[0]?.id ?? null);
      }
    });
  }, [fundId, categoryId]);

  useEffect(() => {
    if (mosqueId) {
      void getCachedMosque(mosqueId).then((m) => {
        if (m?.name) setMosqueName(m.name);
      });
    }
  }, [mosqueId]);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || fundId === null || categoryId === null || method === null) return;
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t('common.errors.invalidAmount'));
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

      const fundObj = funds.find((f) => f.id === fundId);
      const catObj = categories.find((c) => c.id === categoryId);

      setLastVoucher({
        amount: amountMinor,
        payee: payee || t('expenses.unnamedPayee', { defaultValue: 'General Payee' }),
        category: catObj?.name ?? 'General',
        fund: fundObj?.name ?? 'General Fund',
        occurredOn,
        method,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RULE_FUND_RESTRICTION_VIOLATED') {
        setError(t('expenses.errors.RULE_FUND_RESTRICTION_VIOLATED'));
      } else if (err instanceof ApiError && err.code === 'RULE_WAQF_CORPUS_PROTECTED') {
        setError(t('expenses.errors.RULE_WAQF_CORPUS_PROTECTED'));
      } else {
        setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
      }
    } finally {
      setSaving(false);
    }
  }

  const handleShareVoucher = async () => {
    if (!lastVoucher) return;
    const formattedAmount = formatMoney(money(lastVoucher.amount, 'BDT'));
    const mosqueHeader = mosqueName ? `${mosqueName}\n` : '';
    const message = `📋 ${mosqueHeader}Official Expense Payment Voucher
─────────────────────────
Amount: ${formattedAmount}
Payee: ${lastVoucher.payee}
Category: ${lastVoucher.category}
Fund: ${lastVoucher.fund}
Method: ${lastVoucher.method}
Date: ${lastVoucher.occurredOn}
Status: Recorded & Disbursed (Masjid OS)

Verified and accounted for by Mosque Administration.`;

    try {
      await Share.share({
        message,
        title: 'Payment Voucher',
      });
    } catch {
      // Dismissed or cancelled
    }
  };

  const handleResetForNext = () => {
    setAmount('');
    setPayee('');
    setDescription('');
    setLastVoucher(null);
    setError(null);
  };

  if (lastVoucher !== null) {
    return (
      <KeyboardAwareScrollView enableSafeArea style={s.fill} contentContainerStyle={s.content}>
        <View style={s.voucherCard}>
          <Text style={s.voucherBadge}>✓ {t('expenses.recorded', { defaultValue: 'Expense Voucher Recorded' })}</Text>
          <Text style={s.voucherAmount}>{formatMoney(money(lastVoucher.amount, 'BDT'))}</Text>
          <Text style={s.voucherDetail}>
            {lastVoucher.payee} · {lastVoucher.category} ({lastVoucher.fund})
          </Text>
          <View style={s.voucherActions}>
            <Button
              label={t('expenses.shareVoucher', { defaultValue: '📤 Share Voucher (WhatsApp / SMS)' })}
              variant="primary"
              onPress={handleShareVoucher}
            />
            <Button
              label={t('expenses.recordAnother', { defaultValue: '+ Record Another Expense' })}
              variant="secondary"
              onPress={handleResetForNext}
            />
            <Button
              label={t('common.done', { defaultValue: 'Done' })}
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      enableSafeArea
      style={s.fill}
      contentContainerStyle={s.content}
      extraScrollHeight={140}
    >
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

      <View>
        <Text style={s.label}>{t('common.quickAmounts', { defaultValue: 'Quick Amounts' })}</Text>
        <View style={s.presetRow}>
          {PRESET_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              style={[s.presetChip, amount === String(val) && s.presetChipActive]}
              onPress={() => setAmount(String(val))}
            >
              <Text style={[s.presetText, amount === String(val) && s.presetTextActive]}>
                ৳{val}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Input
        label={t('common.amount')}
        placeholder="Enter amount (BDT)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Input label={t('common.date')} value={occurredOn} onChangeText={setOccurredOn} />
      <SelectField
        label={t('common.method')}
        value={method}
        options={EXPENSE_METHODS.map((m) => ({ value: m, label: t(`common.methods.${m}`) }))}
        onChange={setMethod}
      />
      <Input
        label={t('expenses.payee')}
        placeholder="e.g. Dhaka Electric Supply / Cleaner"
        value={payee}
        onChangeText={setPayee}
      />
      <Input
        label={t('expenses.description')}
        placeholder="Optional details or bill reference"
        value={description}
        onChangeText={setDescription}
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
        disabled={fundId === null || categoryId === null || amount === ''}
      />
    </KeyboardAwareScrollView>
  );
}
