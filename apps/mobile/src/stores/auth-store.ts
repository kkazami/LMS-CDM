import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createApiClient, type ApiClient } from '@lms/api-client';
import { API_BASE_URL } from '../lib/constants';
import type { AuthUser } from '@lms/types';

const TOKEN_KEY = 'lumina_auth_token';
const USER_KEY = 'lumina_user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  api: ApiClient;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
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
    api,

    initialize: async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userStr = await SecureStore.getItemAsync(USER_KEY);

        if (token && userStr) {
          const user = JSON.parse(userStr) as AuthUser;
          set({ token, user, isAuthenticated: true, isLoading: false });

          // Verify token is still valid
          try {
            const response = await api.auth.me();
            set({ user: response.user });
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
          } catch {
            // Token invalid, clear state
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            set({ token: null, user: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      } catch {
        set({ isLoading: false });
      }
    },

    login: async (email: string, password: string) => {
      const response = await api.auth.login({ email, password });

      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));

      set({
        token: response.token,
        user: response.user as AuthUser,
        isAuthenticated: true,
      });
    },

    logout: async () => {
      try {
        await api.auth.logout();
      } catch {
        // Ignore logout API errors
      }

      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    },

    setUser: (user: AuthUser) => set({ user }),
  };
});
