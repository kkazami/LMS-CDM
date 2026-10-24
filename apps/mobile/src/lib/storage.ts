import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore is native-only; Expo web uses the browser's storage instead.
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
    try { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); }
    catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
    try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); }
    catch { /* The current session can still run in memory when browser storage is blocked. */ }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
    try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); }
    catch { /* Storage may be unavailable in a restricted browser. */ }
  },
};
