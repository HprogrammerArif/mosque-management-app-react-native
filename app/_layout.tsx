import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useSyncTriggers } from '../src/data/sync-triggers';
import { restoreStoredLanguage } from '../src/i18n';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSyncTriggers();
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_400Regular: require('../assets/fonts/HindSiliguri-Regular.ttf'),
    HindSiliguri_600SemiBold: require('../assets/fonts/HindSiliguri-SemiBold.ttf'),
    IBMPlexSansCondensed_600SemiBold: require('../assets/fonts/IBMPlexSansCondensed-SemiBold.ttf'),
    IBMPlexMono_400Regular: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  });
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    void restoreStoredLanguage()
      .then(() => setLanguageReady(true))
      .catch((err) => {
        console.warn('[RootLayout] restoreStoredLanguage error:', err);
        setLanguageReady(true);
      });
  }, []);

  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError) {
      console.warn('[RootLayout] Custom fonts failed to load, falling back to system fonts:', fontError);
    }
    if (fontsReady && languageReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, languageReady, fontError]);

  if (!fontsReady || !languageReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
