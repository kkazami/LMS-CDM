import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  BackHandler,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewComponent = WebView as any;
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { Text } from '../components/ui/Text';
import { Screen, AppHeader } from '../components/ui';
import { HeaderIconButton } from '../components/ui/AppHeader';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useReducedMotion } from '../lib/design-system';
import { API_BASE_URL, getWebBaseUrl } from '../lib/constants';
import { openSafeUrl } from '../lib/open-link';
import { isIbeUser } from '../lib/ite-eligibility';
import { featureUrlIsTrusted } from '../lib/ics-features';

export type IbeFeature =
  | 'business-plan'
  | 'financial-statements'
  | 'hall-of-fame'
  | 'learning-hub'
  | 'mock-interview'
  | 'wordwise'
  | 'consultation'
  | 'consultation-management'
  | 'gradebooks'
  | 'archives'
  | 'calendar'
  | 'manage-leaderboard'
  | 'create-class';

export const IBE_FEATURE_TITLES: Record<IbeFeature, { title: string; subtitle: string; path?: string }> = {
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
  'consultation': {
    title: 'Consultation & Scheduling',
    subtitle: 'Book and manage faculty consultation slots',
    path: '/ibe/consultation',
  },
  'consultation-management': {
    title: 'Consultation Management',
    subtitle: 'Manage student consultation availability & appointments',
    path: '/ibe/consultation-management',
  },
  'gradebooks': {
    title: 'Gradebooks',
    subtitle: 'Review and export class grades across courses',
    path: '/ibe/gradebooks',
  },
  'archives': {
    title: 'Archived Classes',
    subtitle: 'Review previous and archived classes',
    path: '/ibe/courses/archived',
  },
  'calendar': {
    title: 'Calendar & Tasks',
    subtitle: 'Faculty schedule, deadlines & tasks',
    path: '/ibe/tasks',
  },
  'manage-leaderboard': {
    title: 'Manage Leaderboard',
    subtitle: 'Configure seasons, points & student rankings',
    path: '/ibe/manage-leaderboard',
  },
  'create-class': {
    title: 'Add Class',
    subtitle: 'Create a new IBE class',
    path: '/ibe/teachers?mobileAction=add-class',
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
  const logout = useAuthStore(s => s.logout);

  const web = useRef<WebView<object>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failed = useRef(false);
  const ready = useRef(false);

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';
  const webBaseUrl = getWebBaseUrl();
  const targetPath = info.path ?? `/ibe/${feature}`;
  const fullUrl = `${webBaseUrl}${targetPath}`;
  const allowed = isIbeUser(user) && !!token;

  const source = useMemo(() => ({
    uri: `${API_BASE_URL}/api/auth/mobile-session?returnTo=${encodeURIComponent(targetPath)}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }), [targetPath, token]);
  const currentPage = useRef(source.uri);

  function retry() {
    failed.current = false;
    ready.current = false;
    setError('');
    setSessionExpired(false);
    setLoading(true);
    setCanGoBack(false);
    setAttempt(a => a + 1);
  }

  function requestExit() {
    if (Platform.OS === 'web' || error || !allowed) {
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
    if (Platform.OS === 'web' || feature !== 'mock-interview') return;
    void Camera.getMicrophonePermissionsAsync().then(status => {
      if (!status.granted && status.canAskAgain) {
        return Camera.requestMicrophonePermissionsAsync();
      }
      return status;
    }).catch(() => {});
  }, [feature]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit();
      return true;
    });
    return () => listener.remove();
  }, [canGoBack, error, allowed]);

  useEffect(() => {
    if (Platform.OS === 'web' || !loading || !allowed || error) return;
    const timeout = setTimeout(() => {
      failed.current = true;
      setLoading(false);
      setError('This workspace is taking too long to load. Check your connection and try again.');
    }, 30000);
    return () => clearTimeout(timeout);
  }, [loading, allowed, error, attempt]);

  const setup = `
    (function() {
      window.isLuminaMobileApp = true;
      window.isLMSMobileApp = true;
      window.__LMS_MOBILE_PLATFORM__ = '${Platform.OS}';
      window.__LUMINA_NATIVE_BRIDGE__ = true;
      document.documentElement.dataset.nativeFeature = 'true';
      document.documentElement.dataset.nativeReducedMotion = '${reducedMotion}';
      try { localStorage.setItem('cdm-theme-mode', '${theme.isDark ? 'dark' : 'light'}'); } catch (_) {}
      document.documentElement.classList.toggle('dark', ${theme.isDark});
      document.documentElement.setAttribute('data-theme', '${theme.isDark ? 'dark' : 'light'}');
      if (!window.__IBE_ERR_HOOK__) {
        window.__IBE_ERR_HOOK__ = true;
        window.addEventListener('error', function(e) {
          try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'IBE_WEB_ERROR', message: e.message || String(e.error || 'error') })); } catch (_) {}
        });
        window.addEventListener('unhandledrejection', function(e) {
          try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'IBE_WEB_ERROR', message: String(e.reason || 'rejection') })); } catch (_) {}
        });
      }
      window.dispatchEvent(new Event('lms:native-ready'));
    })(); true;`;
  useEffect(() => { web.current?.injectJavaScript(setup); }, [setup]);

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
          {!allowed || error ? (
            <View style={styles.state}>
              <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
                {!allowed ? 'IBE workspace unavailable' : `Unable to load ${info.title}`}
              </Text>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {!allowed ? 'Sign in with your IBE account to open this workspace.' : error}
              </Text>
              {sessionExpired || !allowed ? (
                <Button
                  title="Sign in again"
                  onPress={() => { void logout().then(() => router.replace('/(auth)/login')); }}
                />
              ) : (
                <Button
                  title="Try again"
                  icon={RefreshCw}
                  onPress={retry}
                />
              )}
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
            <WebViewComponent
              key={attempt}
              ref={web}
              source={source}
              style={{ flex: 1, backgroundColor: theme.colors.background }}
              injectedJavaScriptBeforeContentLoaded={setup}
              injectedJavaScript={setup}
              onMessage={(event: any) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg?.type === 'IBE_WEB_ERROR') {
                    console.warn('[IbeFeatureWebView]', msg.message);
                  }
                } catch { /* ignore */ }
              }}
              onNavigationStateChange={(nav: any) => {
                currentPage.current = nav.url;
                setCanGoBack(nav.canGoBack && nav.url !== source.uri && ready.current);
                if (!nav.loading && !String(nav.url || '').includes('/api/auth/mobile-session')) {
                  ready.current = true;
                }
              }}
              onShouldStartLoadWithRequest={(request: any) => {
                if (featureUrlIsTrusted(request.url, API_BASE_URL)) {
                  const target = new URL(request.url);
                  if (target.pathname === '/login') {
                    setSessionExpired(true);
                    setError('Your session has expired. Sign in again to continue.');
                    return false;
                  }
                  return true;
                }
                if (request.url === 'about:blank' || request.url === 'about:srcdoc') return true;
                if (request.isTopFrame === false) return false;
                void openSafeUrl(request.url, message => Alert.alert('Unable to open link', message));
                return false;
              }}
              onLoadEnd={() => { if (!failed.current) setLoading(false); }}
              onError={() => {
                failed.current = true;
                setLoading(false);
                setError('Could not connect to the feature workspace. Check your internet connection.');
              }}
              onHttpError={(event: any) => {
                if (event.nativeEvent.url !== currentPage.current && event.nativeEvent.url !== source.uri) return;
                if (event.nativeEvent.statusCode >= 400) {
                  failed.current = true;
                  setLoading(false);
                  setSessionExpired(event.nativeEvent.statusCode === 401);
                  setError(
                    event.nativeEvent.statusCode === 401
                      ? 'Your session has expired. Sign in again to continue.'
                      : 'The workspace is unavailable or you do not have access. Try again or open in browser.'
                  );
                }
              }}
              onContentProcessDidTerminate={retry}
              originWhitelist={['*']}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled={false}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="never"
              allowFileAccess={false}
              allowUniversalAccessFromFileURLs={false}
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures={false}
              keyboardDisplayRequiresUserAction={false}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              overScrollMode="never"
              bounces={false}
              nestedScrollEnabled
            />
          )}

          {loading && allowed && !error && (
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

