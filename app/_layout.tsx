import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import '../src/i18n';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular: require('../assets/fonts/HindSiliguri-Regular.ttf'),
    HindSiliguri_600SemiBold: require('../assets/fonts/HindSiliguri-SemiBold.ttf'),
    IBMPlexSansCondensed_600SemiBold: require('../assets/fonts/IBMPlexSansCondensed-SemiBold.ttf'),
    IBMPlexMono_400Regular: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
