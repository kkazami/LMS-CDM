import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { Text } from '../components/ui/Text';
import { Screen, AppHeader } from '../components/ui';
import { HeaderIconButton } from '../components/ui/AppHeader';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useReducedMotion } from '../lib/design-system';
import { getWebBaseUrl } from '../lib/constants';
import { openSafeUrl } from '../lib/open-link';

export type IbeFeature =
  | 'business-plan'
  | 'financial-statements'
  | 'hall-of-fame'
  | 'learning-hub'
  | 'mock-interview'
  | 'wordwise';

export const IBE_FEATURE_TITLES: Record<IbeFeature, { title: string; subtitle: string }> = {
  'business-plan': {
    title: 'Business Plan Guide',
    subtitle: '14 sequential entrepreneurship lessons & venture builder',
  },
  'financial-statements': {
    title: 'Financial Statements',
    subtitle: 'Income Statement, Balance Sheet, Cash Flow & Equity',
  },
  'hall-of-fame': {
    title: 'Hall of Fame',
    subtitle: 'Business leaders, milestones & ethical management',
  },
  'learning-hub': {
    title: 'IBE Learning Hub',
    subtitle: 'Business, finance, marketing & operations courses',
  },
  'mock-interview': {
    title: 'Mock Interview AI',
    subtitle: 'AI interview coach, sample answers & recruiter mode',
  },
  'wordwise': {
    title: 'IBE WordWise',
    subtitle: '150,000+ Dictionary & Academic HR vocabulary',
  },
};

export function IbeFeatureScreen({ feature }: { feature: IbeFeature }) {
  const info = IBE_FEATURE_TITLES[feature] || { title: 'IBE Feature', subtitle: 'Academic workspace' };
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);

  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';
  const webBaseUrl = getWebBaseUrl();
  const targetPath = `/ibe/${feature}`;
  const fullUrl = `${webBaseUrl}${targetPath}`;

  function requestExit() {
    if (Platform.OS === 'web' || error) {
      router.back();
      return;
    }
    if (canGoBack && web.current) {
      web.current.goBack();
      return;
    }
    router.back();
  }

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => listener.remove();
  }, [canGoBack, error]);

  // Auto-open the feature URL in a new tab on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      void openSafeUrl(fullUrl);
    }
  }, [fullUrl]);

  const setup = `
    (function() {
      window.isLuminaMobileApp = true;
      window.isLMSMobileApp = true;
      window.__LMS_MOBILE_PLATFORM__ = '${Platform.OS}';
      try { localStorage.setItem('cdm-theme-mode', '${theme.isDark ? 'dark' : 'light'}'); } catch (_) {}
      document.documentElement.classList.toggle('dark', ${theme.isDark});
      document.documentElement.setAttribute('data-theme', '${theme.isDark ? 'dark' : 'light'}');
      window.dispatchEvent(new Event('lms:native-ready'));
    })(); true;`;

  return (
    <Screen maxWidth={0}>
      <AppHeader
        title={info.title}
        subtitle={info.subtitle}
        showBack
        onBack={requestExit}
        rightAction={
          <HeaderIconButton
            accessibilityLabel="Done"
            onPress={() => router.back()}
          >
            <Text style={{ color: goldAccent, fontWeight: '700', fontSize: 15 }}>Done</Text>
          </HeaderIconButton>
        }
      />

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
            {info.title}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {info.subtitle}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            This feature opens in a new browser tab on the web version.
          </Text>
          <Button
            title={`Open ${info.title}`}
            icon={ExternalLink}
            onPress={() => { void openSafeUrl(fullUrl); }}
          />
          <Button
            title="Go back"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          {error ? (
            <View style={styles.state}>
              <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
                Unable to load {info.title}
              </Text>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {error}
              </Text>
              <Button
                title="Try again"
                icon={RefreshCw}
                onPress={() => {
                  setError('');
                  setLoading(true);
                  setAttempt(a => a + 1);
                }}
              />
              <Button
                title="Open in Browser"
                icon={ExternalLink}
                variant="outline"
                onPress={() => { void openSafeUrl(fullUrl); }}
              />
              <Button
                title="Go back"
                variant="ghost"
                onPress={() => router.back()}
              />
            </View>
          ) : (
            <WebView
              key={attempt}
              ref={web}
              source={{
                uri: fullUrl,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              }}
              style={{ flex: 1, backgroundColor: theme.colors.background }}
              injectedJavaScriptBeforeContentLoaded={setup}
              injectedJavaScript={setup}
              onNavigationStateChange={nav => {
                setCanGoBack(nav.canGoBack);
              }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('Could not connect to the feature workspace. Check your internet connection.');
              }}
            />
          )}

          {loading && !error && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
              <ActivityIndicator size="large" color={goldAccent} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading {info.title}…
              </Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  stateTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 400,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

