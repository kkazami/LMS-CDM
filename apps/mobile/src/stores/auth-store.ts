import { getInstituteName, type AuthUser, type LoginResponse } from '@lms/types';
import { create } from 'zustand';
import { createApiClient, ApiClientError, type ApiClient } from '@lms/api-client';
import { storage } from '../lib/storage';
import { API_BASE_URL } from '../lib/constants';
import { queryClient } from '../lib/query-client';
import { setStudentScope, studentOwner } from '../lib/student-scope';
import { useAlertsStore } from './alerts-store';
import { recordRequest } from '../lib/performance';

const TOKEN_KEY = 'lumina_auth_token';
const USER_KEY = 'lumina_user';
const SESSION_KEY = 'lumina_auth_session_v2';
interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionVerified: boolean;
  mobileCapabilities: LoginResponse['mobileCapabilities'];
  rewardReceipt: LoginResponse['rewardReceipt'] | null;
  api: ApiClient;
  initialize: () => Promise<void>;
  validateSession: () => Promise<void>;
  expireSession: () => void;
  login: (email: string, password: string, instituteCode: string, acceptedPolicies: boolean) => Promise<LoginResponse>;
  register: (data: Parameters<ApiClient['auth']['register']>[0]) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  clearRewardReceipt: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let credentialsQueue: Promise<unknown> = Promise.resolve();
  let authAttempt = 0;
  let validation: Promise<void> | null = null;
  function persist(token: string | null, user: AuthUser | null) {
    const next = credentialsQueue.catch(() => {}).then(async () => {
      if (token && user) {
        // One SecureStore record prevents a token/user mismatch after interruption.
        await storage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
        await Promise.allSettled([storage.deleteItem(TOKEN_KEY), storage.deleteItem(USER_KEY)]);
      } else {
        await storage.deleteItem(SESSION_KEY);
        await storage.deleteItem(TOKEN_KEY);
        await storage.deleteItem(USER_KEY);
      }
    });
    credentialsQueue = next;
    return next;
  }
  function changeIdentity(user: AuthUser | null) {
    setStudentScope(user ? studentOwner(user) : null);
    void queryClient.cancelQueries();
    queryClient.clear();
    useAlertsStore.setState({ unreadCount: 0, loading: false });
  }
  function expireSession() {
    authAttempt += 1;
    changeIdentity(null);
    set({ token: null, user: null, isAuthenticated: false, isSessionVerified: false, isLoading: false, rewardReceipt: null, mobileCapabilities: undefined });
    // Drafts live separately from disposable caches and stay locked without an owner.
    void persist(null, null).catch(() => {});
  }
  const api = createApiClient({
    baseUrl: API_BASE_URL,
    getToken: async () => get().token,
    onUnauthorized: token => { if (get().token === token) expireSession(); },
    onRequestComplete: recordRequest,
  });
  async function establish(response: LoginResponse) {
    const user = response.user as AuthUser;
    changeIdentity(user);
    set({ token: response.token, user, isAuthenticated: true, isSessionVerified: true, isLoading: false, rewardReceipt: response.rewardReceipt ?? null, mobileCapabilities: response.mobileCapabilities });
    await persist(response.token, user);
  }
  return {
    token: null, user: null, isLoading: true, isAuthenticated: false,
    isSessionVerified: false, rewardReceipt: null, mobileCapabilities: undefined, api, expireSession,
    initialize: async () => {
      const attempt = authAttempt;
      try {
        const session = await storage.getItem(SESSION_KEY);
        const record = session ? JSON.parse(session) as { token: string; user: AuthUser } : null;
        const token = record?.token ?? await storage.getItem(TOKEN_KEY);
        const saved = record?.user ? JSON.stringify(record.user) : await storage.getItem(USER_KEY);
        if (attempt !== authAttempt) return;
        if (token && saved) {
          const user = JSON.parse(saved) as AuthUser;
          if (!user.id || !user.institute?.code) throw new Error('Invalid saved identity');
          user.institute.name = getInstituteName(user.institute.code, user.institute.name);
          changeIdentity(user);
          set({ token, user, isAuthenticated: !!record, isLoading: !record, isSessionVerified: false });
          if (record) void get().validateSession();
          else {
            // Legacy split records are verified before exposing a cached identity.
            void get().validateSession().then(() => {
              if (get().token === token) set({ isAuthenticated: get().isSessionVerified, isLoading: false });
            });
          }
        } else set({ isLoading: false });
      } catch { if (attempt === authAttempt) expireSession(); }
    },
    validateSession: async () => {
      if (validation) return validation;
      const token = get().token;
      if (!token) return;
      set({ isSessionVerified: false });
      validation = (async () => {
        try {
          const response = await api.auth.me();
          if (get().token !== token) return;
          if (!get().user || studentOwner(response.user) !== studentOwner(get().user!)) { expireSession(); return; }
          const user = { ...get().user!, ...response.user };
          set({ user, isSessionVerified: true, mobileCapabilities: response.mobileCapabilities });
          await persist(token, user);
        } catch (error) {
          // Resource permission denials (403) are not expired logins.
          if (error instanceof ApiClientError && error.status === 401 && get().token === token) expireSession();
        } finally { validation = null; }
      })();
      return validation;
    },
    login: async (email, password, instituteCode, acceptedPolicies) => {
      const attempt = ++authAttempt;
      const response = await api.auth.login({ identifier: email, password, instituteCode, acceptedPolicies });
      if (attempt !== authAttempt) throw new Error('Sign-in was cancelled. Try again.');
      await establish(response);
      return response;
    },
    register: async data => {
      const attempt = ++authAttempt;
      const response = await api.auth.register(data);
      if (attempt !== authAttempt) throw new Error('Registration sign-in was cancelled.');
      await establish(response);
    },
    logout: async () => {
      const remoteLogout = api.auth.logout().catch(() => {});
      expireSession();
      await remoteLogout;
      await credentialsQueue.catch(() => {});
    },
    setUser: user => {
      if (!get().user || studentOwner(user) !== studentOwner(get().user!)) return;
      set({ user });
      void persist(get().token, user).catch(() => {});
    },
    clearRewardReceipt: () => set({ rewardReceipt: null }),
  };
});
