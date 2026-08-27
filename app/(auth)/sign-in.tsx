import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession, type AuthResponse } from '../../src/stores/session';
import { ApiError } from '../../src/api/client';

const DEVICE_ID = 'bootstrap';   // a persisted per-install device id arrives in Plan 2

const screenStyles = (t: Theme) => ({
  safe: { flex: 1, backgroundColor: t.color.paper },
  body: { flex: 1, justifyContent: 'center' as const, paddingHorizontal: t.space[5] },
  eyebrow: {
    ...t.type.label, fontFamily: t.font.sign,
    textTransform: 'uppercase' as const,
    color: t.color.stone, marginBottom: t.space[2],
  },
  title: {
    ...t.type.display, fontFamily: t.font.textSemi,
    color: t.color.ink, marginBottom: t.space[8],
  },
  errorBox: {
    marginBottom: t.space[4],
    borderRadius: t.radius.base,
    borderWidth: 1, borderColor: t.color.brick,
    backgroundColor: t.color.surface,
    padding: t.space[3],
  },
  errorText: { ...t.type.body, fontFamily: t.font.text, color: t.color.brick },
});

export default function SignIn() {
  const { t } = useTranslation();
  const s = useStyles(screenStyles);
  const signIn = useSession((state) => state.signIn);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    setFormError(null);
    setLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        identifier,
        password,
        device: { id: DEVICE_ID, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' },
      });
      await signIn(response);
      router.replace('/');
    } catch (error) {
      // The server's message is never shown — the code maps to translated copy.
      const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
      setFormError(t(`auth.errors.${code}`, { defaultValue: t('auth.errors.INTERNAL_ERROR') }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.body}
      >
        <Text style={s.eyebrow}>Masjid OS</Text>
        <Text style={s.title}>{t('auth.signIn')}</Text>

        <Input
          label={t('auth.identifier')}
          hint={t('auth.identifierHint')}
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          autoFocus
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {formError !== null && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{formError}</Text>
          </View>
        )}

        <Button label={t('auth.signIn')} onPress={handleSubmit} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
