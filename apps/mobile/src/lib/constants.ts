import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Extracts a hostname from a URI string (e.g. "http://192.168.1.8:8081" -> "192.168.1.8").
 */
export const getHostFromUri = (uri?: string | null): string | null => {
  if (!uri) return null;
  const clean = uri.replace(/^[a-zA-Z]+:\/\//, '');
  const host = clean.split('/')[0]?.split(':')[0];
  return host || null;
};

/**
 * Resolves the default API base URL for the Lumina LMS Mobile App.
 * Prioritizes dynamic Metro host resolution so physical devices connected
 * over Wi-Fi or Hotspot automatically resolve the host PC's IP.
 */
export const getDefaultApiUrl = (): string => {
  // 1. Explicit environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Web platform
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }

  // 3. Extract the Metro packager host dynamically from runtime:
  // A) NativeModules.SourceCode.scriptURL (the exact URL where Metro loaded the JS bundle)
  const scriptURL = (NativeModules as unknown as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  const scriptHost = getHostFromUri(scriptURL);

  // B) Constants.expoConfig.hostUri (Expo CLI hostUri)
  const expoHostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;
  const expoHost = getHostFromUri(expoHostUri);

  const detectedHost = scriptHost || expoHost;

  if (detectedHost) {
    // If it's a real LAN IP or remote hostname (not localhost, 127.0.0.1, or 10.0.2.2)
    if (
      detectedHost !== 'localhost' &&
      detectedHost !== '127.0.0.1' &&
      detectedHost !== '10.0.2.2'
    ) {
      return `http://${detectedHost}:3000`;
    }

    // If the bundle was served from 10.0.2.2, we are in an Android emulator
    if (detectedHost === '10.0.2.2') {
      return 'http://10.0.2.2:3000';
    }

    // If served from localhost / 127.0.0.1:
    // Android emulator cannot reach host PC via localhost; it requires 10.0.2.2
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // 4. Smart fallback for Android physical devices:
  // Fall back to the active development host LAN IP instead of unreachable localhost
  if (Platform.OS === 'android') {
    return 'http://192.168.1.8:3000';
  }

  return 'http://localhost:3000';
};

/**
 * Resolves the effective API URL, checking user custom override in SecureStore first.
 */
export const resolveEffectiveApiUrl = async (): Promise<string> => {
  try {
    const custom = await SecureStore.getItemAsync('lumina_custom_api_url');
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore SecureStore read errors
  }
  return getDefaultApiUrl();
};

export const API_BASE_URL = getDefaultApiUrl();
export const APP_NAME = 'Lumina LMS';


