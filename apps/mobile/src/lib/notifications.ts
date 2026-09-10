import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import type { ApiClient } from '@lms/api-client';

function isExpoGoClient(): boolean {
  try {
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
      return true;
    }
  } catch {
    // fallback
  }

  try {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    );
  } catch {
    return false;
  }
}

let notificationsModule: typeof NotificationsType | null = null;

function getNotificationsModule(): typeof NotificationsType | null {
  if (Platform.OS === 'web') return null;

  // In Expo Go on Android, expo-notifications remote push functionality was removed in SDK 53
  // and attempting to initialize it throws a fatal error that prevents module evaluation.
  if (isExpoGoClient() && Platform.OS === 'android') {
    return null;
  }

  if (notificationsModule) return notificationsModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications');
    return notificationsModule;
  } catch (err) {
    console.warn('[Notifications] Could not load expo-notifications:', err);
    return null;
  }
}

let isHandlerConfigured = false;

export function configureNotificationHandler(): void {
  if (isHandlerConfigured) return;
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });
    isHandlerConfigured = true;
  } catch (err) {
    console.warn('[Notifications] Failed to set notification handler:', err);
  }
}

export async function registerForPushNotificationsAsync(api: ApiClient): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (isExpoGoClient() && Platform.OS === 'android') {
    if (__DEV__) {
      console.info(
        '[Notifications] Push notifications skipped: Android remote push notifications in Expo Go were removed in SDK 53+. Use a development build (EAS Build / prebuild) for full push notification testing.'
      );
    }
    return null;
  }

  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  configureNotificationHandler();

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Set Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF7517',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData?.data) return null;

    const pushToken = tokenData.data;
    await api.notifications
      .registerPushToken({
        token: pushToken,
        deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
      })
      .catch((err) => {
        console.warn('Failed to register push token with backend:', err);
      });

    return pushToken;
  } catch (err) {
    console.warn('Push notification registration skipped:', err);
    return null;
  }
}