import { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import {
  getBillingSummary, listPlans, mockSetPlan, type BillingSummaryResponse, type PlanResponse,
} from '../../src/api/money';

const planStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  currentCard: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    padding: t.space[4], gap: t.space[1],
  },
  currentPlanName: { ...t.type.display, fontFamily: t.font.textSemi, color: t.color.ink },
  status: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  planOption: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    padding: t.space[3], gap: t.space[1],
  },
  planOptionActive: { borderColor: t.color.ochre },
  planName: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  feature: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  note: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone, marginTop: t.space[2] },
});

export default function PlanSettings() {
  const { t } = useTranslation();
  const s = useStyles(planStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const role = useSession((state) =>
    state.memberships.find((m) => m.mosqueId === mosqueId)?.role ?? null);

  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    const [summaryResult, plansResult] = await Promise.all([
      getBillingSummary(api, mosqueId),
      listPlans(api),
    ]);
    setSummary(summaryResult);
    setPlans(plansResult);
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onSwitch = async (planCode: string) => {
    if (mosqueId === null) return;
    setSwitching(planCode);
    try {
      const updated = await mockSetPlan(api, mosqueId, { planCode }, Crypto.randomUUID());
      setSummary(updated);
    } finally {
      setSwitching(null);
    }
  };

  if (summary === null) return <View style={s.fill} />;

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <View style={s.currentCard}>
        <Text style={s.currentPlanName}>{summary.plan.name}</Text>
        <Text style={s.status}>{t(`settings.subscriptionStatus.${summary.subscription.status}`)}</Text>
      </View>

      <View>
        <Text style={s.sectionTitle}>{t('settings.plans')}</Text>
        {plans.map((plan) => (
          <View
            key={plan.code}
            style={[s.planOption, plan.code === summary.plan.code && s.planOptionActive]}
          >
            <Text style={s.planName}>{plan.name}</Text>
            {plan.entitlements.features.length === 0 ? (
              <Text style={s.feature}>{t('settings.noExtraFeatures')}</Text>
            ) : (
              plan.entitlements.features.map((feature) => (
                <Text key={feature} style={s.feature}>{t(`settings.features.${feature}`, feature)}</Text>
              ))
            )}
            {role === 'ADMIN' && plan.code !== summary.plan.code && (
              <View style={{ marginTop: 8 }}>
                <Button
                  label={t('settings.switchTo', { plan: plan.name })}
                  variant="secondary"
                  onPress={() => onSwitch(plan.code)}
                  loading={switching === plan.code}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      <Text style={s.note}>{t('settings.mockBillingNote')}</Text>
    </ScrollView>
  );
}
