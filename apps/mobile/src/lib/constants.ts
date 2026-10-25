import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import { resolveApiUrl, normalizeApiUrl } from './api-url';
import { storage } from './storage';
export { getHostFromUri } from './api-url';

export function getDefaultApiUrl(): string {
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  const hostUri = Constants.expoConfig?.hostUri
    || (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })?.manifest2?.extra?.expoGo?.debuggerHost
    || (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;
  return resolveApiUrl({
    override: process.env.EXPO_PUBLIC_API_URL, development: __DEV__, platform: Platform.OS,
    scriptUrl: scriptURL, hostUri,
    webOrigin: typeof window === 'undefined' ? undefined : window.location?.origin,
  });
}

export async function resolveEffectiveApiUrl(): Promise<string> {
  try {
    const custom = await storage.getItem('lumina_custom_api_url');
    if (custom) return normalizeApiUrl(custom) || getDefaultApiUrl();
  } catch { /* Use the configured default when native storage is unavailable. */ }
  return getDefaultApiUrl();
}

export const API_BASE_URL = getDefaultApiUrl();
export const APP_NAME = 'CdM LMS';
export const getWebBaseUrl = () => API_BASE_URL;
