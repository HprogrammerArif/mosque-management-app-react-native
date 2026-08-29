import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession } from '../../src/stores/session';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { createMosque } from '../../src/api/mosques';
import { ApiError } from '../../src/api/client';

// Dhaka — the ICP's home city (business-case doc) is a sensible starting point for a
// field a first-time, non-technical committee member has no other easy way to fill in;
// they can correct it to their own mosque's coordinates before saving.
const DEFAULT_LATITUDE = '23.8103';
const DEFAULT_LONGITUDE = '90.4125';
const DEFAULT_TIMEZONE = 'Asia/Dhaka';

const formStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[2] },
  title: {
    ...t.type.display, fontFamily: t.font.textSemi,
    color: t.color.ink, marginBottom: t.space[6],
  },
  errorBox: {
    marginBottom: t.space[4], borderRadius: t.radius.base, borderWidth: 1,
    borderColor: t.color.brick, backgroundColor: t.color.surface, padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function CreateMosque() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const refreshMemberships = useSession((state) => state.refreshMemberships);

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const canSubmit = name.trim() !== '' && timezone.trim() !== ''
    && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;

  async function handleSave(): Promise<void> {
    if (!canSubmit) {
      setError(t('common.errors.generic'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createMosque(api, {
        name: name.trim(), timezone: timezone.trim(), latitude: lat, longitude: lng,
      }, Crypto.randomUUID());
      // The register/login response's membership list is now stale (this mosque didn't
      // exist yet) — re-sync from the server before returning to the home screen, which
      // reads role/entitlements from the session store, not a fresh fetch. The home
      // screen's own resolveMosque() picks up the new mosque itself (its cache-miss path
      // already falls back to a live GET /mosques) — nothing else to seed here.
      await refreshMemberships();
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <Text style={s.title}>{t('mosques.createTitle')}</Text>

      <Input label={t('mosques.name')} value={name} onChangeText={setName} autoFocus />
      <Input label={t('mosques.timezone')} value={timezone} onChangeText={setTimezone} />
      <Input
        label={t('mosques.latitude')}
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="decimal-pad"
        hint={t('mosques.locationHint')}
      />
      <Input label={t('mosques.longitude')} value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button label={t('mosques.create')} onPress={handleSave} loading={saving} disabled={!canSubmit} />
    </ScrollView>
  );
}
