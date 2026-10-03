import { useState } from 'react';
import { View, Text, Switch } from 'react-native';
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
import { createAnnouncement } from '../../src/api/money';
import { ApiError } from '../../src/api/client';

const formStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  switchRow: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, minHeight: 48,
  },
  switchLabel: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  errorBox: {
    marginBottom: t.space[4], borderRadius: t.radius.base, borderWidth: 1,
    borderColor: t.color.brick, backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function AddAnnouncement() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || title.trim() === '' || body.trim() === '') return;
    setSaving(true);
    setError(null);
    try {
      await createAnnouncement(api, mosqueId, { title: title.trim(), body: body.trim(), urgent }, Crypto.randomUUID());
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
      <Input label={t('announcements.announcementTitle')} value={title} onChangeText={setTitle} />
      <Input label={t('announcements.body')} value={body} onChangeText={setBody} />

      <View style={s.switchRow}>
        <Text style={s.switchLabel}>{t('announcements.urgent')}</Text>
        <Switch value={urgent} onValueChange={setUrgent} accessibilityLabel={t('announcements.urgent')} />
      </View>

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button
        label={t('common.save')}
        onPress={handleSave}
        loading={saving}
        disabled={title.trim() === '' || body.trim() === ''}
      />
    </KeyboardAwareScrollView>
  );
}
