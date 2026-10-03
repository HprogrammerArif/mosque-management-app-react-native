import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { useMosque } from '../../src/stores/mosque';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { KeyboardAwareScrollView } from '../../src/components/ui/KeyboardAwareScrollView';
import { createStaff } from '../../src/api/money';
import { ApiError } from '../../src/api/client';

const formStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[2] },
  errorBox: {
    marginBottom: t.space[4], borderRadius: t.radius.base, borderWidth: 1,
    borderColor: t.color.brick, backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function AddStaff() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || name.trim() === '') return;
    const monthlySalaryMinor = salary === '' ? 0 : Math.round(Number(salary) * 100);
    if (!Number.isFinite(monthlySalaryMinor) || monthlySalaryMinor < 0) {
      setError('Enter a valid salary');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createStaff(api, mosqueId, {
        name: name.trim(),
        roleTitle: roleTitle === '' ? null : roleTitle,
        phone: phone === '' ? null : phone,
        monthlySalaryMinor,
        currency: 'BDT',
        joinedOn: null,
      }, Crypto.randomUUID());
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      enableSafeArea
      style={s.fill}
      contentContainerStyle={s.content}
      extraScrollHeight={140}
    >
      <Input label={t('payroll.staffName')} value={name} onChangeText={setName} />
      <Input label={t('payroll.roleTitle')} value={roleTitle} onChangeText={setRoleTitle} />
      <Input label={t('households.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={t('payroll.monthlySalary')} value={salary} onChangeText={setSalary} keyboardType="decimal-pad" />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={name.trim() === ''} />
    </KeyboardAwareScrollView>
  );
}
