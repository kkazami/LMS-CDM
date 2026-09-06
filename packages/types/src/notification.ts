export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface RegisterPushTokenInput {
  token: string;
  deviceType: 'ios' | 'android';
}
