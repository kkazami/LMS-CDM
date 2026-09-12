export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export type MobileBridgeMessage =
  | { type: 'HAPTIC_FEEDBACK'; payload: HapticFeedbackType }
  | { type: 'NOTIFICATION_RECEIVED'; payload: { title: string; body: string; data?: Record<string, unknown> } }
  | { type: 'PICK_IMAGE'; requestId: string }
  | { type: 'PICK_DOCUMENT'; requestId: string }
  | { type: 'SESSION_SYNC'; token: string; user?: Record<string, unknown> }
  | { type: 'LOGOUT' }
  | { type: 'THEME_SYNC'; theme: 'light' | 'dark' }
  | { type: 'BIOMETRIC_AUTH'; requestId?: string };

export type MobileBridgeResponse =
  | { type: 'PICK_IMAGE_RESULT'; requestId: string; uri: string | null; base64?: string }
  | { type: 'PICK_DOCUMENT_RESULT'; requestId: string; uri: string | null; name: string; size: number }
  | { type: 'BIOMETRIC_AUTH_RESULT'; requestId?: string; success: boolean };
