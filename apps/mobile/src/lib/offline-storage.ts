import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { studentScope, scopeIsCurrent } from './student-scope';

const CACHE_DIR = `${FileSystem.documentDirectory || ''}lms_offline_cache/`;

async function ensureCacheDirectory(directory: string): Promise<boolean> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return false;
  }
  try {
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
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
  const scope = studentScope();
  if (!scope.owner) return;
  const directory = `${CACHE_DIR}v2/${encodeURIComponent(scope.owner)}/`;
  try {
    const isReady = await ensureCacheDirectory(directory);
    if (!isReady || !scopeIsCurrent(scope)) return;

    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${directory}${safeKey}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
  } catch {
    // Cache writes must never prevent the online view from working.
  }
}

/**
 * Retrieves cached data from local filesystem if available.
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const scope = studentScope();
  if (!scope.owner) return null;
  const directory = `${CACHE_DIR}v2/${encodeURIComponent(scope.owner)}/`;
  try {
    const isReady = await ensureCacheDirectory(directory);
    if (!isReady) return null;

    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${directory}${safeKey}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) return null;

    const content = await FileSystem.readAsStringAsync(filePath);
    return scopeIsCurrent(scope) ? JSON.parse(content) as T : null;
  } catch {
    return null;
  }
}

/**
 * Clears specific key or all offline caches.
 */
export async function clearCachedData(key?: string): Promise<void> {
  const scope = studentScope();
  try {
    if (!FileSystem.documentDirectory) return;

    if (key) {
      const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (!scope.owner) return;
      const filePath = `${CACHE_DIR}v2/${encodeURIComponent(scope.owner)}/${safeKey}.json`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } else {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {
    // Ignore cleanup error
  }
}
