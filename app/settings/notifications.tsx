import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api } from '../../src/stores/session';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import {
  getNotificationPreferences, updateNotificationPreferences, type NotificationPreferencesResponse,
} from '../../src/api/money';

const CATEGORIES = ['announcements', 'duesReminders', 'prayerReminders', 'events'] as const;
type Category = typeof CATEGORIES[number];

const prefStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  row: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, minHeight: 48,
  },
  label: { ...t.type.body, fontFamily: t.font.text, color: t.color.ink },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink, marginTop: t.space[4] },
  note: { ...t.type.caption, fontFamily: t.font.text, color: t.color.stone },
});

export default function NotificationSettings() {
  const { t } = useTranslation();
  const s = useStyles(prefStyles);
  const [prefs, setPrefs] = useState<NotificationPreferencesResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setPrefs(await getNotificationPreferences(api));
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggle = (category: Category, value: boolean) => {
    if (prefs === null) return;
    setPrefs({ ...prefs, [category]: value });
  };

  const onSave = async () => {
    if (prefs === null) return;
    setSaving(true);
    try {
      setPrefs(await updateNotificationPreferences(api, prefs, Crypto.randomUUID()));
    } finally {
      setSaving(false);
    }
  };

  if (prefs === null) return <View style={s.fill} />;

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      {CATEGORIES.map((category) => (
        <View key={category} style={s.row}>
          <Text style={s.label}>{t(`settings.notifications.${category}`)}</Text>
          <Switch
            value={prefs[category]}
            onValueChange={(value) => toggle(category, value)}
            accessibilityLabel={t(`settings.notifications.${category}`)}
          />
        </View>
      ))}

      <Text style={s.sectionTitle}>{t('settings.notifications.quietHours')}</Text>
      <Text style={s.note}>{t('settings.notifications.quietHoursNote')}</Text>
      <Input
        label={t('settings.notifications.quietHoursStart')}
        value={prefs.quietHoursStart}
        onChangeText={(value) => setPrefs({ ...prefs, quietHoursStart: value })}
      />
      <Input
        label={t('settings.notifications.quietHoursEnd')}
        value={prefs.quietHoursEnd}
        onChangeText={(value) => setPrefs({ ...prefs, quietHoursEnd: value })}
      />

      <Button label={t('common.save')} onPress={onSave} loading={saving} />
    </ScrollView>
  );
}
