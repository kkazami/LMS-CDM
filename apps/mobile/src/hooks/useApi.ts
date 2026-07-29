import { useAuthStore } from '../stores/auth-store';

export function useApi() {
  return useAuthStore((state) => state.api);
}
