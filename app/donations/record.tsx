import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SelectField } from '../../src/components/ui/SelectField';
import { getCachedFunds, getCachedMosque } from '../../src/data/sync-mosque';
import { recordDonationOffline, runSync } from '../../src/data/sync-engine';
import { newEntityId } from '../../src/lib/id';
import { money, formatMoney } from '../../src/lib/money';

type CachedFund = { id: string; name: string };

const DONATION_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'CHEQUE', 'IN_KIND'] as const;
const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

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

  // Receipt Card
  receiptCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.sheet,
    padding: t.space[5],
    gap: t.space[4],
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: t.color.verdigris,
    marginVertical: t.space[4],
  },
  receiptBadge: {
    ...t.type.label,
    fontFamily: t.font.sign,
    textTransform: 'uppercase' as const,
    color: t.color.verdigris,
    letterSpacing: 1,
  },
  receiptAmount: {
    ...t.type.ledgerHero,
    fontFamily: t.font.ledger,
    color: t.color.ink,
  },
  receiptDetail: {
    ...t.type.body,
    fontFamily: t.font.text,
    color: t.color.stone,
    textAlign: 'center' as const,
  },
  receiptActions: {
    width: '100%' as const,
    gap: t.space[2],
    marginTop: t.space[2],
  },
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordDonation() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [funds, setFunds] = useState<CachedFund[]>([]);
  const [fundId, setFundId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [method, setMethod] = useState<string | null>('CASH');
  const [donorName, setDonorName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mosqueName, setMosqueName] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<{
    amount: number;
    donor: string;
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
  }, [fundId]);

  useEffect(() => {
    if (mosqueId) {
      void getCachedMosque(mosqueId).then((m) => {
        if (m?.name) setMosqueName(m.name);
      });
    }
  }, [mosqueId]);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || fundId === null || method === null) return;
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError(t('common.errors.invalidAmount'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fundObj = funds.find((f) => f.id === fundId);
      await recordDonationOffline({
        id: newEntityId(),
        fundId,
        amountMinor,
        currency: 'BDT',
        occurredOn,
        method,
        donorHouseholdId: null,
        donorName: donorName === '' ? null : donorName,
        anonymous: false,
        receiptNo: null,
        note: note === '' ? null : note,
      });

      setLastReceipt({
        amount: amountMinor,
        donor: donorName || t('donations.anonymousDonor', { defaultValue: 'Anonymous Donor' }),
        fund: fundObj?.name ?? 'General Fund',
        occurredOn,
        method,
      });

      void runSync(api, mosqueId);
    } catch {
      setError(t('common.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const handleShareReceipt = async () => {
    if (!lastReceipt) return;
    const formattedAmount = formatMoney(money(lastReceipt.amount, 'BDT'));
    const mosqueHeader = mosqueName ? `${mosqueName}\n` : '';
    const message = `🕌 ${mosqueHeader}Official Donation Receipt
─────────────────────────
Amount: ${formattedAmount}
Fund: ${lastReceipt.fund}
Donor: ${lastReceipt.donor}
Method: ${lastReceipt.method}
Date: ${lastReceipt.occurredOn}
Status: Verified & Recorded (Masjid OS)

JazakAllahu Khayran for your generous contribution.`;

    try {
      await Share.share({
        message,
        title: 'Donation Receipt',
      });
    } catch {
      // Dismissed or cancelled
    }
  };

  const handleResetForNext = () => {
    setAmount('');
    setDonorName('');
    setNote('');
    setLastReceipt(null);
    setError(null);
  };

  if (lastReceipt !== null) {
    return (
      <ScrollView style={s.fill} contentContainerStyle={s.content}>
        <View style={s.receiptCard}>
          <Text style={s.receiptBadge}>✓ {t('donations.recorded', { defaultValue: 'Donation Recorded' })}</Text>
          <Text style={s.receiptAmount}>{formatMoney(money(lastReceipt.amount, 'BDT'))}</Text>
          <Text style={s.receiptDetail}>
            {lastReceipt.donor} · {lastReceipt.fund}
          </Text>
          <View style={s.receiptActions}>
            <Button
              label={t('donations.shareReceipt', { defaultValue: '📤 Share Receipt (WhatsApp / SMS)' })}
              variant="primary"
              onPress={handleShareReceipt}
            />
            <Button
              label={t('donations.recordAnother', { defaultValue: '+ Record Another Donation' })}
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
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <SelectField
        label={t('donations.fund')}
        value={fundId}
        options={funds.map((f) => ({ value: f.id, label: f.name }))}
        onChange={setFundId}
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
        options={DONATION_METHODS.map((m) => ({ value: m, label: t(`common.methods.${m}`) }))}
        onChange={setMethod}
      />
      <Input
        label={t('donations.donorName')}
        placeholder="Optional (e.g. Haji Selim)"
        value={donorName}
        onChangeText={setDonorName}
      />
      <Input
        label={t('common.note')}
        placeholder="Optional note"
        value={note}
        onChangeText={setNote}
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

