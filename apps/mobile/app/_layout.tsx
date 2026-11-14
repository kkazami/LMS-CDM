import * as Sentry from '@sentry/react-native';
import { navigationMonitoring } from '../src/lib/sentry';
import React, { useEffect } from 'react';
import { Slot, useNavigationContainerRef, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, LogBox, View, AppState, Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { useThemeStore } from '../src/stores/theme-store';
import { useAuthStore } from '../src/stores/auth-store';
import { OfflineNotice } from '../src/components/common/OfflineNotice';
import { Toaster } from 'burnt/web';
import { syncCardQueue } from '../src/lib/flashcard-queue';
import { studentReturnRoute } from '../src/lib/student-navigation';
import { setCachedData } from '../src/lib/offline-storage';
import { useAlertsStore } from '../src/stores/alerts-store';
import { observeUsefulContent } from '../src/lib/performance';

// Prevent splash from auto-hiding until we explicitly dismiss it
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known Expo Router 55 / React Native 0.83 warnings
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  /useLinking/,
]);

function RootLayout() {
  useEffect(() => observeUsefulContent((screen, value) => Sentry.setMeasurement(`mobile.${screen}.useful_content`, value, 'millisecond')), []);
  const pathname = usePathname(), params = useGlobalSearchParams();
  const userId = useAuthStore(s => s.user?.id);
  const returnRoute = studentReturnRoute(pathname, params);
  useEffect(() => { if (userId && returnRoute) void setCachedData('return_intent', returnRoute); }, [userId, returnRoute]);
  const navigationRef = useNavigationContainerRef();
  useEffect(() => { if (navigationRef) navigationMonitoring.registerNavigationContainer(navigationRef); }, [navigationRef]);
  const isDark = useThemeStore((s) => s.isDark);
  const initializeTheme = useThemeStore((s) => s.initializeTheme);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const verified = useAuthStore(s => s.isSessionVerified);
  useEffect(() => { if (verified) void syncCardQueue().catch(() => {}); }, [verified]);

  useEffect(() => {
    const lifecycle = AppState.addEventListener('change', state => {
      if (state === 'active') void useAuthStore.getState().validateSession().then(() => {
        const auth = useAuthStore.getState();
        if (auth.isSessionVerified) void useAlertsStore.getState().fetchUnreadCount(auth.api);
      });
    });
    const appearance = Appearance.addChangeListener(({ colorScheme }) => {
      if (useThemeStore.getState().themePreference === 'system') {
        useThemeStore.setState({ isDark: colorScheme === 'dark' });
      }
    });
    return () => { lifecycle.remove(); appearance.remove(); };
  }, []);

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
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View
            style={[
              styles.container,
              { backgroundColor: isDark ? '#0F1117' : '#FAF8F1' },
            ]}
          >
            <OfflineNotice />
            <Slot />
            <Toaster />
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

export default Sentry.wrap(RootLayout);
