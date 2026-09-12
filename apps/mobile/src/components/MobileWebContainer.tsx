import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, BackHandler, Platform, Linking } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL, resolveEffectiveApiUrl } from '../lib/constants';
import { useThemeStore } from '../stores/theme-store';
import OfflineFallbackScreen from './OfflineFallbackScreen';

/** Timeout (ms) before declaring the connection timed out. */
const LOAD_TIMEOUT_MS = 20000;

interface MobileWebContainerProps {
  onReady?: () => void;
}

export default function MobileWebContainer({ onReady }: MobileWebContainerProps) {
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialUri, setInitialUri] = useState<string | null>(null);

  // Hardware Back Button Handler (Android)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  // Handle messages sent from Web App to Native App
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'HAPTIC_FEEDBACK': {
          if (data.payload === 'success') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          } else if (data.payload === 'error') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          } else if (data.payload === 'warning') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          } else if (data.payload === 'heavy') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          } else if (data.payload === 'medium') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          } else if (data.payload === 'selection') {
            await Haptics.selectionAsync().catch(() => {});
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          break;
        }

        case 'THEME_SYNC': {
          if (data.theme === 'light' || data.theme === 'dark') {
            await useThemeStore.getState().setThemePreference(data.theme).catch(() => {});
          }
          break;
        }

        case 'SESSION_SYNC': {
          if (data.token) {
            await SecureStore.setItemAsync('lumina_auth_token', data.token).catch(() => {});
          }
          if (data.user && typeof data.user === 'object') {
            const u = data.user as { institute?: { code?: string }; role?: string };
            if (u.institute?.code) {
              await SecureStore.setItemAsync('lumina_user_institute', u.institute.code).catch(() => {});
            }
            if (u.role) {
              await SecureStore.setItemAsync('lumina_user_role', u.role).catch(() => {});
            }
          }
          break;
        }

        case 'LOGOUT': {
          await SecureStore.deleteItemAsync('lumina_auth_token').catch(() => {});
          await SecureStore.deleteItemAsync('lumina_user_institute').catch(() => {});
          await SecureStore.deleteItemAsync('lumina_user_role').catch(() => {});
          break;
        }

        case 'PICK_IMAGE': {
          try {
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
              base64: true,
            });
            if (!res.canceled && res.assets && res.assets[0]) {
              const asset = res.assets[0];
              const escapedUri = asset.uri ? asset.uri.replace(/'/g, "\\'") : '';
              const safeBase64 = asset.base64 ? asset.base64.replace(/'/g, "\\'") : '';
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', {
                  detail: { requestId: '${data.requestId}', uri: '${escapedUri}', base64: '${safeBase64}' }
                }));
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', {
                  detail: { requestId: '${data.requestId}', uri: null, canceled: true }
                }));
                true;
              `);
            }
          } catch {
            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', {
                detail: { requestId: '${data.requestId}', uri: null, error: true }
              }));
              true;
            `);
          }
          break;
        }

        case 'PICK_DOCUMENT': {
          try {
            const res = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'application/zip', 'text/*', 'image/*'],
              copyToCacheDirectory: true,
            });
            if (!res.canceled && res.assets && res.assets[0]) {
              const doc = res.assets[0];
              const escapedUri = doc.uri ? doc.uri.replace(/'/g, "\\'") : '';
              const escapedName = doc.name ? doc.name.replace(/'/g, "\\'") : 'file';
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', {
                  detail: { requestId: '${data.requestId}', name: '${escapedName}', size: ${doc.size || 0}, uri: '${escapedUri}' }
                }));
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', {
                  detail: { requestId: '${data.requestId}', uri: null, canceled: true }
                }));
                true;
              `);
            }
          } catch {
            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', {
                detail: { requestId: '${data.requestId}', uri: null, error: true }
              }));
              true;
            `);
          }
          break;
        }

        case 'BIOMETRIC_AUTH': {
          const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
          const isEnrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
          let success = false;
          if (hasHardware && isEnrolled) {
            const authRes = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to access CdM LMS',
              fallbackLabel: 'Use Passcode',
            }).catch(() => ({ success: false }));
            success = authRes.success;
          }
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('MOBILE_BIOMETRIC_RESULT', {
              detail: { requestId: '${data.requestId || ''}', success: ${success} }
            }));
            true;
          `);
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn('Bridge parse error:', e);
    }
  };

  // Determine smart fast-boot initialUri using dynamic resolution
  useEffect(() => {
    let isMounted = true;
    async function determineInitialUri() {
      try {
        const token = await SecureStore.getItemAsync('lumina_auth_token');
        const institute = (await SecureStore.getItemAsync('lumina_user_institute')) || 'ics';
        const baseUri = await resolveEffectiveApiUrl();

        if (!isMounted) return;

        if (token) {
          // Let the web app handle role-based redirect from /{institute}
          setInitialUri(`${baseUri}/${institute}`);
        } else {
          setInitialUri(`${baseUri}/login?institute=${institute}`);
        }
      } catch {
        if (!isMounted) return;
        const fallbackBase = API_BASE_URL.replace(/\/+$/, '');
        setInitialUri(`${fallbackBase}/login?institute=ics`);
      }
    }
    determineInitialUri();
    return () => {
      isMounted = false;
    };
  }, []);

  // Safety Timeout: Never let the screen hang indefinitely on a stalled connection.
  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(`Connection timed out after ${LOAD_TIMEOUT_MS / 1000}s. Unable to reach ${initialUri || 'the server'}.`);
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoading, initialUri]);

  // Retry handler: resolve new URI before reloading
  const handleRetry = useCallback(async () => {
    setHasError(false);
    setErrorMessage(null);
    try {
      const baseUri = await resolveEffectiveApiUrl();
      const token = await SecureStore.getItemAsync('lumina_auth_token');
      const institute = (await SecureStore.getItemAsync('lumina_user_institute')) || 'ics';
      const nextUri = token
        ? `${baseUri}/${institute}`
        : `${baseUri}/login?institute=${institute}`;
      setInitialUri(nextUri);
      setIsLoading(true);
    } catch {
      setIsLoading(true);
      webViewRef.current?.reload();
    }
  }, []);

  const injectedBefore = `
    window.isLMSMobileApp = true;
    window.__LMS_MOBILE_PLATFORM__ = '${Platform.OS}';
    true;
  `;

  // Inject initialization script to signal native environment and ensure viewport/safe-area
  const injectedJavaScript = `
    (function() {
      window.isLMSMobileApp = true;
      window.__LMS_MOBILE_PLATFORM__ = '${Platform.OS}';
      try {
        sessionStorage.setItem('lumina_is_mobile_app', 'true');
        localStorage.setItem('lumina_is_mobile_app', 'true');
        document.cookie = 'lumina_is_mobile_app=true; path=/; max-age=31536000; SameSite=Lax';
      } catch(e) {}
      // Ensure viewport meta exists for proper mobile rendering
      if (!document.querySelector('meta[name="viewport"]')) {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(meta);
      }
      // Inject native safe area insets as CSS custom properties
      document.documentElement.style.setProperty('--sat', '${insets.top}px');
      document.documentElement.style.setProperty('--sar', '${insets.right}px');
      document.documentElement.style.setProperty('--sab', '${insets.bottom}px');
      document.documentElement.style.setProperty('--sal', '${insets.left}px');
      // Ensure fixed bottom navigation respects device safe area
      if (${insets.bottom} > 0) {
        var safeStyle = document.getElementById('lms-mobile-safe-area');
        if (!safeStyle) {
          safeStyle = document.createElement('style');
          safeStyle.id = 'lms-mobile-safe-area';
          document.head.appendChild(safeStyle);
        }
        safeStyle.textContent = 'nav.fixed.bottom-0 { padding-bottom: max(env(safe-area-inset-bottom, 0px), ${insets.bottom}px) !important; }';
      }
    })();
    true;
  `;

  const customUserAgent =
    Platform.OS === 'android'
      ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 LuminaLMSMobile/1.0'
      : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LuminaLMSMobile/1.0';

  // Intercept navigation to external URLs — open in system browser
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;
      // Derive the origin from our initialUri
      const origin = initialUri ? initialUri.split('/').slice(0, 3).join('/') : '';
      // Allow same-origin navigation
      if (origin && url.startsWith(origin)) {
        return true;
      }
      // Allow about:blank, data:, blob: URIs
      if (/^(about:|data:|blob:)/.test(url)) {
        return true;
      }
      // Open external URLs in the system browser
      Linking.openURL(url).catch(() => {});
      return false;
    },
    [initialUri]
  );

  // Handle navigation state changes: detect forced login redirect (stale token)
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    // Detect forced redirect to login (session expired in web app)
    if (navState.url && /\/login(\?|$)/.test(navState.url)) {
      SecureStore.deleteItemAsync('lumina_auth_token').catch(() => {});
      SecureStore.deleteItemAsync('lumina_user_institute').catch(() => {});
      SecureStore.deleteItemAsync('lumina_user_role').catch(() => {});
    }
  }, []);

  if (hasError && initialUri) {
    return (
      <OfflineFallbackScreen
        onRetry={handleRetry}
        targetUrl={initialUri}
        errorMessage={errorMessage ?? undefined}
      />
    );
  }

  if (!initialUri) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF7517" />
          <Text style={styles.loadingText}>Starting CdM LMS...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUri }}
        style={styles.webview}
        userAgent={customUserAgent}
        injectedJavaScript={injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={injectedBefore}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={() => {
          setIsLoading(false);
          setHasError(false);
          onReady?.();
        }}
        onError={(syntheticEvent) => {
          const desc = syntheticEvent.nativeEvent?.description || 'Connection failed';
          console.warn('WebView error: ', desc);
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(desc);
        }}
        onHttpError={(syntheticEvent) => {
          const code = syntheticEvent.nativeEvent?.statusCode;
          console.warn('WebView HTTP error: ', code);
          if (code >= 400) {
            setIsLoading(false);
            setHasError(true);
            setErrorMessage(`Server returned HTTP ${code}`);
          }
        }}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        pullToRefreshEnabled={Platform.OS === 'ios'}
        bounces={Platform.OS === 'ios'}
        androidLayerType="hardware"
        overScrollMode="never"
        nestedScrollEnabled={true}
        cacheEnabled={!__DEV__}
        allowsBackForwardNavigationGestures={true}
        startInLoadingState={false}
      />
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FF7517" />
          <Text style={styles.loadingText}>Connecting to CdM LMS...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0F1117',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1117',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
});
