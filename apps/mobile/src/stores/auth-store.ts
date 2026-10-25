import { getInstituteName } from "@lms/types";
import { create } from 'zustand';
import { storage } from '../lib/storage';
import { createApiClient, ApiClientError, type ApiClient } from '@lms/api-client';
import { API_BASE_URL } from '../lib/constants';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import type { AuthUser, LoginResponse } from '@lms/types';

const TOKEN_KEY = 'lumina_auth_token';
const USER_KEY = 'lumina_user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  rewardReceipt: LoginResponse['rewardReceipt'] | null;
  api: ApiClient;

  initialize: () => Promise<void>;
  login: (email: string, password: string, instituteCode: string, acceptedPolicies: boolean) => Promise<LoginResponse>;
  register: (data: Parameters<ApiClient['auth']['register']>[0]) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  clearRewardReceipt: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const api = createApiClient({
    baseUrl: API_BASE_URL,
    getToken: async () => get().token,
  });

  return {
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    rewardReceipt: null,
    api,

    initialize: async () => {
      try {
        const token = await storage.getItem(TOKEN_KEY);
        const userStr = await storage.getItem(USER_KEY);

        if (token && userStr) {
          const user = JSON.parse(userStr) as AuthUser;
          user.institute.name = getInstituteName(user.institute.code, user.institute.name);
          set({ token, user, isAuthenticated: true, isLoading: false });

          // Verify token is still valid
          try {
            const response = await api.auth.me();
            set({ user: response.user });
            await storage.setItem(USER_KEY, JSON.stringify(response.user));
            registerForPushNotificationsAsync(api).catch(() => {});
          } catch (error) {
            if (!(error instanceof ApiClientError) || ![401, 403].includes(error.status)) return;
            // Only a server rejection invalidates saved credentials.
            await storage.deleteItem(TOKEN_KEY);
            await storage.deleteItem(USER_KEY);
            set({ token: null, user: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      } catch {
        set({ isLoading: false });
      }
    },

    login: async (email: string, password: string, instituteCode: string, acceptedPolicies: boolean) => {
      const response = await api.auth.login({ identifier: email, password, instituteCode, acceptedPolicies });

      await storage.setItem(TOKEN_KEY, response.token);
      await storage.setItem(USER_KEY, JSON.stringify(response.user));

      set({
        token: response.token,
        user: response.user as AuthUser,
        isAuthenticated: true,
        rewardReceipt: response.rewardReceipt || null,
      });

      registerForPushNotificationsAsync(api).catch(() => {});

      return response;
    },

    register: async data => {
      const response = await api.auth.register(data);
      await storage.setItem(TOKEN_KEY, response.token);
      await storage.setItem(USER_KEY, JSON.stringify(response.user));
      set({ token: response.token, user: response.user as AuthUser, isAuthenticated: true, rewardReceipt: null });
    },

    logout: async () => {
      try {
        await api.auth.logout();
      } catch {
        // Ignore logout API errors
      }

      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(USER_KEY);
      await storage.deleteItem('lumina_user_institute').catch(() => {});
      await storage.deleteItem('lumina_user_role').catch(() => {});
      try {
        const { clearCachedData } = await import('../lib/offline-storage');
        await clearCachedData();
      } catch {
        // Ignore cache clear error
      }
      set({ token: null, user: null, isAuthenticated: false, rewardReceipt: null });
    },

    setUser: (user: AuthUser) => set({ user }),
    clearRewardReceipt: () => set({ rewardReceipt: null }),
  };
});
