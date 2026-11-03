type NativeWindow = Window & { __LMS_NATIVE_OWNER__?: string };
export function nativeDraftKey(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const owner = (window as NativeWindow).__LMS_NATIVE_OWNER__;
  return owner ? `lms-native-draft:v1:${encodeURIComponent(owner)}:${key}` : null;
}
export function readNativeDraft<T>(key: string): T | null {
  const scoped = nativeDraftKey(key);
  if (!scoped) return null;
  try { return JSON.parse(localStorage.getItem(scoped) ?? 'null') as T | null; }
  catch { return null; }
}
export function writeNativeDraft(key: string, value: unknown): boolean {
  const scoped = nativeDraftKey(key);
  if (!scoped) return true;
  try { localStorage.setItem(scoped, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function removeNativeDraft(key: string) {
  const scoped = nativeDraftKey(key);
  try { if (scoped) localStorage.removeItem(scoped); } catch { /* A confirmed post must not be offered for resubmission. */ }
}
