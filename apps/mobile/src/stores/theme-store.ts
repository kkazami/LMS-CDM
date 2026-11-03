import { create } from 'zustand';
import { storage } from '../lib/storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeOrigin = { x: number; y: number };
let transition: ((origin?: ThemeOrigin) => Promise<void>) | null = null;
export function registerThemeTransition(handler: typeof transition) { transition = handler; }

interface ThemeState {
  themePreference: ThemePreference;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: (origin?: ThemeOrigin) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_PREF_KEY = 'lumina_theme_pref';

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'system',
  isDark: Appearance.getColorScheme() === 'dark',

  initializeTheme: async () => {
    try {
      const saved = await storage.getItem(THEME_PREF_KEY);
      const pref = (saved as ThemePreference) || 'system';
      const systemDark = Appearance.getColorScheme() === 'dark';
      const isDark = pref === 'system' ? systemDark : pref === 'dark';
      set({ themePreference: pref, isDark });
    } catch {
      // Fallback
    }
  },

  setThemePreference: async (pref: ThemePreference) => {
    const systemDark = Appearance.getColorScheme() === 'dark';
    const isDark = pref === 'system' ? systemDark : pref === 'dark';
    set({ themePreference: pref, isDark });
    try {
      await storage.setItem(THEME_PREF_KEY, pref);
    } catch {
      // Fallback
    }
  },

  toggleTheme: async (origin) => {
    if (transition) return transition(origin);
    const nextDark = !get().isDark;
    const pref: ThemePreference = nextDark ? 'dark' : 'light';
    set({ themePreference: pref, isDark: nextDark });
    try {
      await storage.setItem(THEME_PREF_KEY, pref);
    } catch {
      // Fallback
    }
  },
}));
