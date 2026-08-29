import { useState } from 'react';
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
import { createCommitteeMember } from '../../src/api/money';
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

export default function AddCommitteeMember() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || name.trim() === '') return;
    setSaving(true);
    setError(null);
    try {
      await createCommitteeMember(api, mosqueId, {
        name: name.trim(),
        position: position === '' ? null : position,
        phone: phone === '' ? null : phone,
        termStart: null,
        termEnd: null,
      }, Crypto.randomUUID());
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <Input label={t('committee.memberName')} value={name} onChangeText={setName} />
      <Input label={t('committee.position')} value={position} onChangeText={setPosition} />
      <Input label={t('households.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={name.trim() === ''} />
    </ScrollView>
  );
}
