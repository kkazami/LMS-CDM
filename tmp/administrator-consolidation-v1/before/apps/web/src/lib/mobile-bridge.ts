import type { HapticFeedbackType, MobileBridgeMessage } from '@lms/types';

/**
 * Detects if the web app is running inside the Expo Mobile App container.
 */
export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView || (window as unknown as { isLMSMobileApp?: boolean }).isLMSMobileApp);
}

/**
 * Gets the current mobile platform ('ios' | 'android' | null).
 */
export function getMobilePlatform(): 'ios' | 'android' | 'web' | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { __LMS_MOBILE_PLATFORM__?: 'ios' | 'android' | 'web' }).__LMS_MOBILE_PLATFORM__ || null;
}

/**
 * Posts a typed message to the Expo React Native container via ReactNativeWebView.
 */
function postBridgeMessage(message: MobileBridgeMessage) {
  if (typeof window === 'undefined') return;
  try {
    const rn = (window as unknown as { ReactNativeWebView?: { postMessage: (msg: string) => void } }).ReactNativeWebView;
    if (rn && typeof rn.postMessage === 'function') {
      rn.postMessage(JSON.stringify(message));
    }
  } catch (e) {
    console.warn('postBridgeMessage error:', e);
  }
}

/**
 * Triggers tactile native haptic feedback on the device.
 */
export function triggerNativeHaptic(type: HapticFeedbackType = 'light') {
  try {
    if (isMobileApp()) {
      postBridgeMessage({ type: 'HAPTIC_FEEDBACK', payload: type });
    }
  } catch {
    // Non-critical: ignore
  }
}

/**
 * Synchronizes the web session token to the native secure storage.
 */
export function syncSessionToNative(token: string, user?: Record<string, unknown>) {
  try {
    if (isMobileApp()) {
      postBridgeMessage({ type: 'SESSION_SYNC', token, user });
    }
  } catch {
    // Non-critical: ignore
  }
}

/**
 * Clears the session from native secure storage upon logout.
 */
export function logoutFromNative() {
  try {
    if (isMobileApp()) {
      postBridgeMessage({ type: 'LOGOUT' });
    }
  } catch {
    // Non-critical: ignore
  }
}

/**
 * Requests the native device image picker (camera roll/gallery).
 */
export function pickNativeImage(): Promise<{ uri: string; base64?: string } | null> {
  return new Promise((resolve) => {
    if (!isMobileApp()) {
      resolve(null);
      return;
    }

    const requestId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('MOBILE_IMAGE_PICKED', handler as EventListener);
      resolve(null);
    }, 60000);

    const handler = (event: CustomEvent<{ requestId: string; uri: string | null; base64?: string; canceled?: boolean; error?: boolean }>) => {
      if (event.detail && event.detail.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('MOBILE_IMAGE_PICKED', handler as EventListener);
        if (event.detail.canceled || event.detail.error || !event.detail.uri) {
          resolve(null);
        } else {
          resolve({ uri: event.detail.uri, base64: event.detail.base64 });
        }
      }
    };

    window.addEventListener('MOBILE_IMAGE_PICKED', handler as EventListener);
    postBridgeMessage({ type: 'PICK_IMAGE', requestId });
  });
}

/**
 * Requests the native device document picker.
 */
export function pickNativeDocument(): Promise<{ uri: string; name: string; size: number } | null> {
  return new Promise((resolve) => {
    if (!isMobileApp()) {
      resolve(null);
      return;
    }

    const requestId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('MOBILE_DOCUMENT_PICKED', handler as EventListener);
      resolve(null);
    }, 60000);

    const handler = (event: CustomEvent<{ requestId: string; name?: string; size?: number; uri: string | null; canceled?: boolean; error?: boolean }>) => {
      if (event.detail && event.detail.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('MOBILE_DOCUMENT_PICKED', handler as EventListener);
        if (event.detail.canceled || event.detail.error || !event.detail.uri) {
          resolve(null);
        } else {
          resolve({
            uri: event.detail.uri,
            name: event.detail.name || 'document',
            size: event.detail.size || 0,
          });
        }
      }
    };

    window.addEventListener('MOBILE_DOCUMENT_PICKED', handler as EventListener);
    postBridgeMessage({ type: 'PICK_DOCUMENT', requestId });
  });
}

/**
 * Requests FaceID or Fingerprint authentication from the native device.
 */
export function requestBiometricAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isMobileApp()) {
      resolve(false);
      return;
    }

    const requestId = `bio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener('MOBILE_BIOMETRIC_RESULT', handler as EventListener);
      resolve(false);
    }, 30000);

    const handler = (event: CustomEvent<{ requestId: string; success: boolean }>) => {
      if (event.detail && (!event.detail.requestId || event.detail.requestId === requestId)) {
        clearTimeout(timeout);
        window.removeEventListener('MOBILE_BIOMETRIC_RESULT', handler as EventListener);
        resolve(Boolean(event.detail.success));
      }
    };

    window.addEventListener('MOBILE_BIOMETRIC_RESULT', handler as EventListener);
    postBridgeMessage({ type: 'BIOMETRIC_AUTH', requestId });
  });
}
