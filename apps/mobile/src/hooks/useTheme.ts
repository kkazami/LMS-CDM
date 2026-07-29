import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { getInstituteTheme, type InstituteTheme } from '../lib/theme';

export function useTheme(): InstituteTheme {
  const user = useAuthStore((state) => state.user);
  return useMemo(
    () => getInstituteTheme(user?.institute?.code || 'ics'),
    [user?.institute?.code]
  );
}
