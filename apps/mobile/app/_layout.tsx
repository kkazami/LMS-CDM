import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { useThemeStore } from '../src/stores/theme-store';
import { useAuthStore } from '../src/stores/auth-store';
import { OfflineNotice } from '../src/components/common/OfflineNotice';

// Prevent splash from auto-hiding until we explicitly dismiss it
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known Expo Router 55 / React Native 0.83 warnings
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  /useLinking/,
]);

export default function RootLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([
          initializeTheme(),
          initializeAuth(),
        ]);
      } catch (err) {
        console.error('ROOT_BOOTSTRAP_ERROR', err);
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    bootstrap();
  }, [initializeTheme, initializeAuth]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0F1117' : '#FFFFFF'} />
          <View
            style={[
              styles.container,
              { backgroundColor: isDark ? '#0F1117' : '#FAF8F1' },
            ]}
          >
            <OfflineNotice />
            <Slot />
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
