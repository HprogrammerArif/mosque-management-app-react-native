import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { KeyboardAwareScrollView } from '../../src/components/ui/KeyboardAwareScrollView';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ApiError } from '../../src/api/client';
import {
  getDuesCharge, listDuesPayments, waiveDuesCharge,
  type DuesChargeResponse, type DuesPaymentResponse,
} from '../../src/api/money';
import { money, formatMoney, type Currency } from '../../src/lib/money';

const detailStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  summary: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    padding: t.space[4], gap: t.space[1],
  },
  period: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  status: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.brick },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  paymentRow: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 40, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  paymentDate: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  paymentAmount: { ...t.type.body, fontFamily: t.font.ledger, color: t.color.ink },
  errorBox: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.brick,
    backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

const SETTLED_STATUSES = new Set(['PAID', 'WAIVED']);

export default function DuesChargeDetail() {
  const { t } = useTranslation();
  const s = useStyles(detailStyles);
  const { chargeId } = useLocalSearchParams<{ chargeId: string }>();
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [charge, setCharge] = useState<DuesChargeResponse | null>(null);
  const [payments, setPayments] = useState<DuesPaymentResponse[]>([]);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiving, setWaiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    try {
      const [chargeResult, paymentsResult] = await Promise.all([
        getDuesCharge(api, mosqueId, chargeId),
        listDuesPayments(api, mosqueId, chargeId),
      ]);
      setCharge(chargeResult);
      setPayments(paymentsResult);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [mosqueId, chargeId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onWaive = async () => {
    if (mosqueId === null || waiveReason.trim() === '') return;
    setWaiving(true);
    setError(null);
    try {
      await waiveDuesCharge(api, mosqueId, chargeId, { reason: waiveReason.trim() }, Crypto.randomUUID());
      await load();
      setWaiveReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setWaiving(false);
    }
  };

  if (charge === null) {
    return loadError
      ? <EmptyState message={t('common.errors.loadFailed')} actionLabel={t('common.retry')} onAction={load} />
      : <View style={s.fill} />;
  }

  const remainingMinor = charge.amountMinor - charge.paidMinor;
  const settled = SETTLED_STATUSES.has(charge.status);

  return (
    <KeyboardAwareScrollView
      enableSafeArea
      style={s.fill}
      contentContainerStyle={s.content}
      extraScrollHeight={140}
    >
      <View style={s.summary}>
        <Text style={s.period}>{charge.period}</Text>
        <Text style={s.status}>{t(`dues.statuses.${charge.status}`)}</Text>
        <Text style={s.amount}>
          {formatMoney(money(remainingMinor, charge.currency as Currency))} {t('dues.remaining')}
        </Text>
      </View>

      {!settled && (
        <Button
          label={t('dues.recordPayment')}
          onPress={() => router.push(`/dues/${chargeId}/payment`)}
        />
      )}

      <View>
        <Text style={s.sectionTitle}>{t('dues.payments')}</Text>
        {payments.length === 0 ? (
          <Text style={s.paymentDate}>{t('dues.noPayments')}</Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={s.paymentRow}>
              <Text style={s.paymentDate}>{payment.paidOn} · {t(`common.methods.${payment.method}`)}</Text>
              <Text style={s.paymentAmount}>
                {formatMoney(money(payment.amountMinor, payment.currency as Currency))}
              </Text>
            </View>
          ))
        )}
      </View>

      {!settled && (
        <View>
          <Text style={s.sectionTitle}>{t('dues.waive')}</Text>
          <Input label={t('dues.waiveReason')} value={waiveReason} onChangeText={setWaiveReason} />
          {error !== null && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          <Button
            label={t('dues.waive')}
            variant="secondary"
            onPress={onWaive}
            loading={waiving}
            disabled={waiveReason.trim() === ''}
          />
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}
