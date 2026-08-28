import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import en from './en.json';
import bn from './bn.json';

export const SUPPORTED_LANGUAGES = ['bn', 'en'] as const;
export type AppLanguage = typeof SUPPORTED_LANGUAGES[number];

const LANGUAGE_KEY = 'app_language';
// Bangla is the product's default language (roadmap §"Language priority") — device
// locale only overrides it when the device is explicitly set to English.
const DEFAULT_LANGUAGE: AppLanguage = 'bn';

function isSupported(code: string | null | undefined): code is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(code as AppLanguage);
}

function detectDeviceLanguage(): AppLanguage {
  const tag = Localization.getLocales()[0]?.languageCode ?? undefined;
  return isSupported(tag) ? tag : DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

/**
 * Restores an explicit in-app language choice (settings screen) over the device-locale
 * default. Call once at startup, before the first screen renders language-dependent text.
 */
export async function restoreStoredLanguage(): Promise<void> {
  const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
  if (isSupported(stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
  await i18n.changeLanguage(language);
}

/**
 * Applies an account's saved locale (set at registration, FR-TEN-6) the first time it's
 * seen on this device — an explicit in-app choice made afterward always wins, so this
 * never overwrites one.
 */
export async function applyAccountLocaleIfUnset(locale: string): Promise<void> {
  const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
  if (stored !== null) return;
  if (isSupported(locale)) await i18n.changeLanguage(locale);
}

export default i18n;
