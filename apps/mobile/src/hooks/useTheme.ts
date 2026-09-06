import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useThemeStore } from '../stores/theme-store';
import { getInstituteTheme, type InstituteTheme } from '../lib/theme';

export function useTheme(): InstituteTheme {
  const user = useAuthStore((state) => state.user);
  const isDark = useThemeStore((state) => state.isDark);

  return useMemo(
    () => getInstituteTheme(user?.institute?.code || 'ics', isDark),
    [user?.institute?.code, isDark]
  );
}
