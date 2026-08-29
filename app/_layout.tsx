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
  console.log('[RootLayout] render start');
  useSyncTriggers();
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_400Regular: require('../assets/fonts/HindSiliguri-Regular.ttf'),
    HindSiliguri_600SemiBold: require('../assets/fonts/HindSiliguri-SemiBold.ttf'),
    IBMPlexSansCondensed_600SemiBold: require('../assets/fonts/IBMPlexSansCondensed-SemiBold.ttf'),
    IBMPlexMono_400Regular: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  });
  const [languageReady, setLanguageReady] = useState(false);

  console.log('[RootLayout] fontsLoaded:', fontsLoaded, 'fontError:', fontError, 'languageReady:', languageReady);

  useEffect(() => {
    console.log('[RootLayout] restoreStoredLanguage starting');
    void restoreStoredLanguage()
      .then(() => { console.log('[RootLayout] restoreStoredLanguage done'); setLanguageReady(true); })
      .catch((err) => console.error('[RootLayout] restoreStoredLanguage error:', err));
  }, []);

  useEffect(() => {
    console.log('[RootLayout] hide check — fontsLoaded:', fontsLoaded, 'languageReady:', languageReady);
    if (fontsLoaded && languageReady) void SplashScreen.hideAsync();
  }, [fontsLoaded, languageReady]);

  if (!fontsLoaded || !languageReady) {
    console.log('[RootLayout] returning null — waiting for:', !fontsLoaded ? 'fonts' : '', !languageReady ? 'language' : '');
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
