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

/**
 * Validates that two URLs have the exact same scheme and host (exact parsed-origin comparison).
 * Replaces insecure string startsWith() matching.
 */
function isSameOrigin(targetUrl?: string, referenceUrl?: string): boolean {
  if (!targetUrl || !referenceUrl) return false;
  try {
    const target = new URL(targetUrl);
    const reference = new URL(referenceUrl);
    return target.protocol === reference.protocol && target.host === reference.host;
  } catch {
    return false;
  }
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
      // Security: Validate message origin strictly against the authorized LMS domain
      const senderUrl = event.nativeEvent?.url;
      const expectedUrl = initialUri || API_BASE_URL;

      if (!isSameOrigin(senderUrl, expectedUrl)) {
        console.warn('Rejected bridge message from untrusted origin:', senderUrl);
        return;
      }

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
          if (data.token && typeof data.token === 'string') {
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
              const detail = JSON.stringify({
                requestId: data.requestId,
                uri: asset.uri || null,
                base64: asset.base64 || null,
              });
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', { detail: ${detail} }));
                true;
              `);
            } else {
              const detail = JSON.stringify({
                requestId: data.requestId,
                uri: null,
                canceled: true,
              });
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', { detail: ${detail} }));
                true;
              `);
            }
          } catch {
            const detail = JSON.stringify({
              requestId: data.requestId,
              uri: null,
              error: true,
            });
            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('MOBILE_IMAGE_PICKED', { detail: ${detail} }));
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
              const detail = JSON.stringify({
                requestId: data.requestId,
                name: doc.name || 'file',
                size: doc.size || 0,
                uri: doc.uri || '',
              });
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', { detail: ${detail} }));
                true;
              `);
            } else {
              const detail = JSON.stringify({
                requestId: data.requestId,
                uri: null,
                canceled: true,
              });
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', { detail: ${detail} }));
                true;
              `);
            }
          } catch {
            const detail = JSON.stringify({
              requestId: data.requestId,
              uri: null,
              error: true,
            });
            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('MOBILE_DOCUMENT_PICKED', { detail: ${detail} }));
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
          const detail = JSON.stringify({
            requestId: data.requestId || '',
            success,
          });
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('MOBILE_BIOMETRIC_RESULT', { detail: ${detail} }));
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

  // Safety Timeout
  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Connection timed out. The LMS server may be unreachable.');
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setErrorMessage(null);
    webViewRef.current?.reload();
  }, []);

  // Injected scripts
  const injectedBefore = `
    window.isLuminaMobileApp = true;
    window.__LUMINA_NATIVE_BRIDGE__ = true;
    window.__LUMINA_PLATFORM__ = '${Platform.OS}';
    true;
  `;

  const injectedJavaScript = `
    (function() {
      window.isLuminaMobileApp = true;
      window.__LUMINA_NATIVE_BRIDGE__ = true;
      window.__LUMINA_PLATFORM__ = '${Platform.OS}';

      if (${insets.top} > 0) {
        document.documentElement.style.setProperty('--sat', '${insets.top}px');
      }
      if (${insets.bottom} > 0) {
        document.documentElement.style.setProperty('--sab', '${insets.bottom}px');
      }

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
      ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 CdMLMSMobile/1.0 LuminaLMSMobile/1.0'
      : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CdMLMSMobile/1.0 LuminaLMSMobile/1.0';

  // Intercept navigation to external URLs using exact parsed origin comparison
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const url = request.url;
      const expectedUrl = initialUri || API_BASE_URL;

      // Allow same-origin navigation strictly
      if (isSameOrigin(url, expectedUrl)) {
        return true;
      }

      // Allow safe scheme URIs
      if (/^(about:|data:|blob:)/.test(url)) {
        return true;
      }

      // Open external URLs in system browser, verifying https: protocol strictly
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || (__DEV__ && parsed.hostname === 'localhost')) {
          Linking.openURL(url).catch(() => {});
        }
      } catch {
        // Discard invalid URLs
      }
      return false;
    },
    [initialUri]
  );

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
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
        originWhitelist={['https://*', 'http://localhost:*', 'http://127.0.0.1:*', API_BASE_URL]}
        mixedContentMode="never"
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
