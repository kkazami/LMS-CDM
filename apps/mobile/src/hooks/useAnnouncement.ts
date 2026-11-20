import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useAnnouncement(message: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (enabled && message && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
  }, [message, enabled]);
}
