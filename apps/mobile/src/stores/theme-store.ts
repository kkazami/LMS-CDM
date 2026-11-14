import { create } from 'zustand';
import { storage } from '../lib/storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeOrigin = { x: number; y: number };

interface ThemeState {
  themePreference: ThemePreference;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: (origin?: ThemeOrigin) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_PREF_KEY = 'lumina_theme_pref';
let preferenceWrite = Promise.resolve();

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
    // Rapid toggles paint immediately but persist in order, so a slower earlier
    // write cannot restore the wrong preference on the next launch.
    preferenceWrite = preferenceWrite.then(() => storage.setItem(THEME_PREF_KEY, pref)).catch(() => {});
    await preferenceWrite;
  },

  // Paint immediately; capturing the entire screen before changing theme caused
  // a noticeable pause on Android and blocked subsequent taps.
  toggleTheme: () => get().setThemePreference(get().isDark ? 'light' : 'dark'),
}));
