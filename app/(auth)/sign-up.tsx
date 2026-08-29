import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { api, useSession } from '../../src/stores/session';
import { register } from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import i18n from '../../src/i18n';

const screenStyles = (t: Theme) => ({
  safe: { flex: 1, backgroundColor: t.color.paper },
  body: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' as const, paddingHorizontal: t.space[5], paddingVertical: t.space[8] },
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
  switchLink: { marginTop: t.space[5], minHeight: 44, justifyContent: 'center' as const },
  switchText: { ...t.type.body, fontFamily: t.font.text, color: t.color.verdigris, textAlign: 'center' as const },
});

/** Same phone shape the backend's registerSchema requires: +countrycode digits. */
function looksLikePhone(identifier: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(identifier);
}

export default function SignUp() {
  const { t } = useTranslation();
  const s = useStyles(screenStyles);
  const signIn = useSession((state) => state.signIn);

  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const response = await register(api, {
        displayName: displayName.trim(),
        password,
        locale: i18n.language,
        ...(trimmed.includes('@') ? { email: trimmed } : { phone: trimmed }),
      });
      await signIn(response);
      router.replace('/');
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
      setFormError(t(`auth.errors.${code}`, { defaultValue: t('auth.errors.INTERNAL_ERROR') }));
    } finally {
      setLoading(false);
    }
  }

  const identifierValid = identifier.includes('@') ? identifier.includes('.') : looksLikePhone(identifier.trim());
  const canSubmit = displayName.trim() !== '' && identifierValid && password.length >= 8 && confirmPassword !== '';

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.body}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.eyebrow}>Masjid OS</Text>
          <Text style={s.title}>{t('auth.signUp')}</Text>

          <Input
            label={t('auth.displayName')}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
          />
          <Input
            label={t('auth.identifier')}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {formError !== null && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{formError}</Text>
            </View>
          )}

          <Button label={t('auth.signUp')} onPress={handleSubmit} loading={loading} disabled={!canSubmit} />

          <Pressable
            style={s.switchLink}
            onPress={() => router.replace('/(auth)/sign-in')}
            accessibilityRole="button"
          >
            <Text style={s.switchText}>{t('auth.haveAccount')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
