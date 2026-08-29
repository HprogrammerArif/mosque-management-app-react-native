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
import { acceptInvitation } from '../../src/api/mosques';
import { ApiError } from '../../src/api/client';

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

const KNOWN_ERROR_CODES = ['NOT_FOUND', 'INVITATION_ALREADY_ACCEPTED', 'INVITATION_EXPIRED'] as const;

export default function AcceptInvitation() {
  const { t } = useTranslation();
  const s = useStyles(formStyles);
  const refreshMemberships = useSession((state) => state.refreshMemberships);

  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAccept(): Promise<void> {
    if (token.trim() === '') return;
    setSaving(true);
    setError(null);
    try {
      await acceptInvitation(api, token.trim(), Crypto.randomUUID());
      // Same reasoning as mosques/create.tsx — this device's membership list just
      // changed and the home screen reads it from the session store, not a live fetch.
      await refreshMemberships();
      router.replace('/');
    } catch (err) {
      const code = err instanceof ApiError
        && (KNOWN_ERROR_CODES as readonly string[]).includes(err.code) ? err.code : null;
      setError(code !== null
        ? t(`invitations.errors.${code}`)
        : err instanceof ApiError ? err.message : t('common.errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <Text style={s.title}>{t('invitations.title')}</Text>

      <Input
        label={t('invitations.tokenLabel')}
        hint={t('invitations.tokenHint')}
        value={token}
        onChangeText={setToken}
        autoFocus
      />

      {error !== null && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <Button label={t('invitations.accept')} onPress={handleAccept} loading={saving} disabled={token.trim() === ''} />
    </ScrollView>
  );
}
