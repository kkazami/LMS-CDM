import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { Screen, AppHeader } from '../components/ui';
import { HeaderIconButton } from '../components/ui/AppHeader';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useReducedMotion } from '../lib/design-system';
import { API_BASE_URL } from '../lib/constants';
import { isIcsUser } from '../lib/ite-eligibility';
import { openSafeUrl } from '../lib/open-link';
import { featureUrlIsTrusted, icsFeaturePath, type IcsFeature } from '../lib/ics-features';
import { PracticalLabsScreen } from './PracticalLabsScreen';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const TITLES: Record<IcsFeature, string> = { codelab: 'CodeLab', 'knowledge-exchange': 'Knowledge Exchange', 'practical-labs': 'Practical Labs', assessment: 'Assessment', 'create-class': 'Add Class', archives: 'Archived Classes', organization: 'Organizational Chart', seasons: 'Leaderboard Manager' };

export function IcsFeatureScreen({ feature }: { feature: IcsFeature }) {
  const { courseId, assignmentId, formId, postId, view } = useLocalSearchParams<{ courseId?: string; assignmentId?: string; formId?: string; postId?: string; view?: string }>();
  if (feature === 'practical-labs' && !courseId) return <PracticalLabsScreen />;
  const path = feature === 'codelab' && view === 'instructor' ? '/ics/activities/codelab/instructor' : icsFeaturePath(feature, courseId, feature === 'assessment' ? formId : assignmentId, postId);
  return <FeatureWorkspace key={`${feature}:${path}`} feature={feature} path={path} />;
}

function FeatureWorkspace({ feature, path }: { feature: IcsFeature; path: string | null }) {
  const theme = useTheme();
  const title = feature === 'codelab' && path?.endsWith('/instructor') ? 'CodeLab Analytics' : TITLES[feature];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const verified = useAuthStore(s => s.isSessionVerified);
  const hybridReady = (useAuthStore(s => s.mobileCapabilities)?.hybridDrafts ?? 0) >= 1;
  const { isOffline } = useNetworkStatus();
  const logout = useAuthStore(s => s.logout);
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failed = useRef(false);
  const ready = useRef(false);
  const allowed = isIcsUser(user) && !!token && !!path && (verified || ready.current);
  const source = React.useMemo(() => ({
    uri: `${API_BASE_URL}/api/auth/mobile-session?returnTo=${encodeURIComponent(path || '')}`,
    headers: { Authorization: `Bearer ${token}` },
  }), [path, token]);
  const currentPage = useRef(source.uri);

  function retry() {
    failed.current = false; ready.current = false;
    setError(''); setSessionExpired(false); setLoading(true); setCanGoBack(false); setAttempt(value => value + 1);
  }
  const exitAction = useRef<'back' | 'close'>('close');
  function requestExit(action: 'back' | 'close') {
    if (Platform.OS === 'web' || error || !allowed) { router.back(); return; }
    if (loading) {
      if (!ready.current) { router.back(); return; }
      Alert.alert('Leave this workspace?', 'The page is reloading, so the app cannot confirm whether the latest changes saved.', [{ text: 'Stay here', style: 'cancel' }, { text: 'Leave workspace', style: 'destructive', onPress: () => router.back() }]);
      return;
    }
    exitAction.current = action;
    web.current?.injectJavaScript(`(function() {
      var safe = window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FEATURE_EXIT', safe: safe }));
    })(); true;`);
  }
  function back() {
    requestExit(canGoBack ? 'back' : 'close');
  }
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      requestExit(canGoBack ? 'back' : 'close'); return true;
    });
    return () => listener.remove();
  }, [canGoBack, error, loading, allowed]);
  useEffect(() => {
    if (Platform.OS === 'web' || !loading || !allowed) return;
    const timeout = setTimeout(() => { failed.current = true; setLoading(false); setError('This workspace is taking too long to load. Check your connection and try again.'); }, 30000);
    return () => clearTimeout(timeout);
  }, [loading, allowed, attempt]);

  const setup = `
    (function() {
      window.isLuminaMobileApp = true;
      window.isLMSMobileApp = true;
      window.__LMS_MOBILE_PLATFORM__ = '${Platform.OS}';
      window.__LUMINA_NATIVE_BRIDGE__ = true;
      window.__LMS_NATIVE_OWNER__ = ${JSON.stringify(user ? `${user.institute.code}:${user.id}` : '')};
      if (!window.__LMS_AUTH_FETCH__) {
        window.__LMS_AUTH_FETCH__ = true;
        var originalFetch = window.fetch;
        window.fetch = function() { return originalFetch.apply(this, arguments).then(function(response) {
          if (response.status === 401) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FEATURE_AUTH_EXPIRED' }));
          return response;
        }); };
      }
      document.documentElement.dataset.nativeFeature = 'true';
      document.documentElement.dataset.nativeReducedMotion = '${reducedMotion}';
      try { localStorage.setItem('cdm-theme-mode', '${theme.isDark ? 'dark' : 'light'}'); } catch (_) {}
      document.documentElement.classList.toggle('dark', ${theme.isDark});
      document.documentElement.setAttribute('data-theme', '${theme.isDark ? 'dark' : 'light'}');
      window.dispatchEvent(new Event('lms:native-ready'));
    })(); true;`;
  useEffect(() => { web.current?.injectJavaScript(setup); }, [setup]);

  return <Screen maxWidth={0}>
    <AppHeader title={title} titleNumberOfLines={2} showBack onBack={back} rightAction={
      <HeaderIconButton accessibilityLabel="Close workspace" onPress={() => requestExit('close')}><Text style={{ color: theme.colors.text, fontWeight: '600' }}>Done</Text></HeaderIconButton>
    } />
    {!allowed || !hybridReady || error || feature === 'assessment' && (process.env.EXPO_PUBLIC_ICS_ASSESSMENTS_ENABLED === 'false' || isOffline && !ready.current) ? <View style={styles.state}>
      <Text accessibilityRole="header" style={[styles.stateTitle, { color: theme.colors.text }]}>{!allowed ? 'ICS workspace unavailable' : 'Unable to load workspace'}</Text>
      <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.colors.textSecondary }]}>{!allowed ? 'Reconnect to verify your ICS sign-in and unlock this workspace. Saved drafts stay on this device.' : !hybridReady ? 'This workspace needs the updated web portal. Continue in your browser until the update is available.' : feature === 'assessment' && process.env.EXPO_PUBLIC_ICS_ASSESSMENTS_ENABLED === 'false' ? 'In-app assessments are temporarily unavailable. Continue in the web portal with your LMS sign-in.' : isOffline ? 'Assessments require a connection. Reconnect to resume the existing attempt; the server timer continues during interruptions.' : error}</Text>
      {sessionExpired ? <Button title="Sign in again" onPress={() => { void logout().then(() => router.replace('/(auth)/login')); }} />
        : allowed && <Button title="Try again" icon={RefreshCw} onPress={retry} />}
      <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      {!hybridReady && <Button title="Continue in the web portal" onPress={() => { void openSafeUrl(`${API_BASE_URL}${path}`); }} />}
      {feature === 'assessment' && process.env.EXPO_PUBLIC_ICS_ASSESSMENTS_ENABLED === 'false' && <Button title="Continue in the web portal" onPress={() => { void openSafeUrl(`${API_BASE_URL}${path}`); }} />}
    </View> : Platform.OS === 'web' ? <View style={styles.state}>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>Use the iOS or Android app for the in-app workspace. In this browser preview, continue in the web portal.</Text>
      <Button title={`Open ${title}`} onPress={() => { void openSafeUrl(`${API_BASE_URL}${path}`); }} />
    </View> : <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <WebView key={attempt} ref={web} source={source}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        injectedJavaScriptBeforeContentLoaded={setup} injectedJavaScript={setup}
        onMessage={event => {
          if (!featureUrlIsTrusted(event.nativeEvent.url, API_BASE_URL)) return;
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'FEATURE_AUTH_EXPIRED') { useAuthStore.getState().expireSession(); return; }
            if (message.type !== 'FEATURE_EXIT' || typeof message.safe !== 'boolean') return;
            const leave = () => { if (exitAction.current === 'back') web.current?.goBack(); else router.back(); };
            if (message.safe) leave();
            else Alert.alert('Unsaved work', 'Save your work before leaving. Unsaved changes may be lost.', [
              { text: 'Keep working', style: 'cancel' }, { text: 'Leave without saving', style: 'destructive', onPress: leave },
            ]);
          } catch { /* Ignore messages outside the feature protocol. */ }
        }}
        onNavigationStateChange={state => {
          currentPage.current = state.url;
          // Hide the session bootstrap from native Back history.
          setCanGoBack(state.canGoBack && state.url !== source.uri && ready.current);
          if (!state.loading && !state.url.includes('/api/auth/mobile-session')) ready.current = true;
        }}
        onShouldStartLoadWithRequest={request => {
          if (featureUrlIsTrusted(request.url, API_BASE_URL)) {
            const target = new URL(request.url);
            if (target.pathname === '/login') { setSessionExpired(true); setError('Your session has expired. Sign in again to continue.'); return false; }
            return true;
          }
          if (request.url === 'about:blank' || request.url === 'about:srcdoc') return true;
          if (request.isTopFrame === false) return false;
          void openSafeUrl(request.url, message => Alert.alert('Unable to open link', message));
          return false;
        }}
        onLoadEnd={() => { if (!failed.current) setLoading(false); }}
        onError={() => { failed.current = true; setLoading(false); setError('Check your internet connection, then try again.'); }}
        onHttpError={event => {
          // A failed image or other subresource must not discard an open editor.
          if (event.nativeEvent.url !== currentPage.current && event.nativeEvent.url !== source.uri) return;
          if (event.nativeEvent.statusCode >= 400) {
            failed.current = true; setLoading(false);
            setSessionExpired(event.nativeEvent.statusCode === 401);
            setError(event.nativeEvent.statusCode === 401 ? 'Your session has expired. Sign in again to continue.' : 'The workspace is unavailable or you do not have access. Try again or return to your courses.');
          }
        }}
        onContentProcessDidTerminate={retry}
        // Intercept every scheme here, rather than letting WebView open unmatched schemes itself.
        originWhitelist={['*']}
        sharedCookiesEnabled thirdPartyCookiesEnabled={false}
        javaScriptEnabled domStorageEnabled mixedContentMode="never" allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false} setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false} keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
        overScrollMode="never" bounces={false} nestedScrollEnabled
      />
      {loading && <View style={[StyleSheet.absoluteFill, styles.state, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.colors.textSecondary }]}>Opening {title}…</Text>
      </View>}
      {feature === 'assessment' && isOffline && ready.current && <View style={[StyleSheet.absoluteFill, styles.state, { backgroundColor: theme.colors.background }]}>
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.colors.text }]}>Connection lost. Reconnect to continue. Keep this screen open while your answers recover; the assessment deadline still applies.</Text>
      </View>}
    </View>}
  </Screen>;
}

const styles = StyleSheet.create({
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  stateTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 440 },
});
