import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CACHE_DIR = `${FileSystem.documentDirectory || ''}lms_offline_cache/`;

async function ensureCacheDirectory(): Promise<boolean> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return false;
  }
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Persists data to local filesystem cache for offline viewing.
 */
export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const isReady = await ensureCacheDirectory();
    if (!isReady) return;

    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${CACHE_DIR}${safeKey}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to write offline cache for key: ${key}`, err);
  }
}

/**
 * Retrieves cached data from local filesystem if available.
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const isReady = await ensureCacheDirectory();
    if (!isReady) return null;

    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${CACHE_DIR}${safeKey}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) return null;

    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Clears specific key or all offline caches.
 */
export async function clearCachedData(key?: string): Promise<void> {
  try {
    if (!FileSystem.documentDirectory) return;

    if (key) {
      const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `${CACHE_DIR}${safeKey}.json`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } else {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {
    // Ignore cleanup error
  }
}