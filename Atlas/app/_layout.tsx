// app/_layout.tsx
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import AuthProvider from './components/auth/AuthProvider';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Load Ionicons font for icons
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    // Hide splash screen when fonts are loaded OR after timeout
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    } else {
      // Fallback timeout to prevent indefinite loading
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  // Don't block rendering - let the app load even without fonts
  // Icons might be missing briefly but app will be functional

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}