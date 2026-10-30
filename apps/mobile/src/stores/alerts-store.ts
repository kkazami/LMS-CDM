import { create } from 'zustand';
import { studentScope, scopeIsCurrent } from '../lib/student-scope';

interface AlertsStoreState {
  unreadCount: number;
  loading: boolean;
  setUnreadCount: (count: number) => void;
  fetchUnreadCount: (api: any) => Promise<void>;
}

export const useAlertsStore = create<AlertsStoreState>((set) => ({
  unreadCount: 0,
  loading: false,
  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),
  fetchUnreadCount: async (api: any) => {
    const scope = studentScope();
    if (!api?.notifications?.list) return;
    try {
      set({ loading: true });
      const res = await api.notifications.list();
      if (scopeIsCurrent(scope) && res?.notifications && Array.isArray(res.notifications)) {
        const count = res.unreadCount ?? res.notifications.filter((n: any) => !n.isRead).length;
        set({ unreadCount: count });
      }
    } catch {
      // Fallback silently without throwing
    } finally {
      set({ loading: false });
    }
  },
}));
