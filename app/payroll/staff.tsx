import { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { listStaff, type StaffResponse } from '../../src/api/money';
import { money, formatMoney, type Currency } from '../../src/lib/money';

const listStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[4] },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    minHeight: 48, alignItems: 'center' as const,
    borderBottomWidth: 1, borderBottomColor: t.color.surface, paddingVertical: t.space[2],
  },
  rowLeft: { flex: 1 },
  name: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  role: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
  amount: { ...t.type.ledger, fontFamily: t.font.ledger, color: t.color.ink },
});

export default function StaffList() {
  const { t } = useTranslation();
  const s = useStyles(listStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);
  const [staff, setStaff] = useState<StaffResponse[] | null>(null);

  const load = useCallback(async () => {
    if (mosqueId === null) return;
    setStaff(await listStaff(api, mosqueId));
  }, [mosqueId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (staff === null) return <View style={s.fill} />;

  return (
    <View style={s.fill}>
      <View style={s.content}>
        <Button label={t('payroll.addStaff')} onPress={() => router.push('/payroll/add-staff')} />
      </View>

      {staff.length === 0 ? (
        <EmptyState message={t('payroll.noStaff')} />
      ) : (
        <FlatList
          contentContainerStyle={s.content}
          data={staff}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.name}>{item.name}</Text>
                {item.roleTitle !== null && <Text style={s.role}>{item.roleTitle}</Text>}
              </View>
              <Text style={s.amount}>
                {formatMoney(money(item.monthlySalaryMinor, item.currency as Currency))}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
