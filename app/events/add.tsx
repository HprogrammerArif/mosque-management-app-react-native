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
import { createEvent } from '../../src/api/money';
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddEvent() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const mosqueId = useMosque((state) => state.currentMosqueId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('13:00');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    if (mosqueId === null || title.trim() === '') return;
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setError('Enter a valid date and time');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createEvent(api, mosqueId, {
        title: title.trim(),
        description: description === '' ? null : description,
        startsAt: startsAt.toISOString(),
        endsAt: null,
        location: location === '' ? null : location,
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
      <Input label={t('events.eventTitle')} value={title} onChangeText={setTitle} />
      <Input label={t('expenses.description')} value={description} onChangeText={setDescription} />
      <Input label={t('common.date')} value={date} onChangeText={setDate} />
      <Input label={t('events.time')} value={time} onChangeText={setTime} />
      <Input label={t('events.location')} value={location} onChangeText={setLocation} />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={title.trim() === ''} />
    </KeyboardAwareScrollView>
  );
}
