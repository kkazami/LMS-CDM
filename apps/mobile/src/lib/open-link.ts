import { Linking } from 'react-native';
import { sanitizeUrl } from './links';

/**
 * Safely opens a validated URL using React Native's Linking.
 * If validation fails or Linking.openURL throws, invokes onError callback.
 */
export async function openSafeUrl(
  rawUrl: string,
  onError?: (message: string) => void
): Promise<boolean> {
  const check = sanitizeUrl(rawUrl);
  if (!check.isValid) {
    onError?.(check.reason || 'This link cannot be opened because it uses an unsupported or invalid format.');
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(check.url);
    if (!supported) {
      await Linking.openURL(check.url);
      return true;
    }
    await Linking.openURL(check.url);
    return true;
  } catch (err: any) {
    onError?.(err?.message || 'Unable to open this link on your device.');
    return false;
  }
}
