export type InstituteCode = 'ics' | 'ibe' | 'ite';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface InstituteTheme {
  code: InstituteCode;
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    primaryHover: string;
    sidebar: string;
    sidebarMuted: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    card: string;
    cardSecondary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderMuted: string;
    ring: string;
    success: string;
    successBg: string;
    successBackground: string;
    warning: string;
    warningBg: string;
    warningBackground: string;
    danger: string;
    dangerBg: string;
    dangerBackground: string;
    info: string;
    infoBg: string;
    infoBackground: string;
    chartAxis: string;
    chartGrid: string;
    chartLabel: string;
  };
}

const LIGHT_SEMANTIC = {
  success: '#10B981',
  successBg: '#ECFDF5',
  successBackground: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBackground: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBackground: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  infoBackground: '#EFF6FF',
  chartAxis: '#D1D5DB',
  chartGrid: '#E5E7EB',
  chartLabel: '#6B7280',
};

const DARK_SEMANTIC = {
  success: '#10B981',
  successBg: '#064E3B',
  successBackground: '#064E3B',
  warning: '#F59E0B',
  warningBg: '#451A03',
  warningBackground: '#451A03',
  danger: '#EF4444',
  dangerBg: '#450A0A',
  dangerBackground: '#450A0A',
  info: '#3B82F6',
  infoBg: '#1E293B',
  infoBackground: '#1E293B',
  chartAxis: '#374151',
  chartGrid: '#1F2433',
  chartLabel: '#9CA3AF',
};

const icsLightTheme: InstituteTheme = {
  code: 'ics',
  name: 'Institute of Computing Studies',
  isDark: false,
  colors: {
    primary: '#FF7517',
    primaryHover: '#FC8236',
    sidebar: '#2C2727',
    sidebarMuted: '#3E3939',
    background: '#F6F4F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    card: '#FFFFFF',
    cardSecondary: '#F9FAFB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderMuted: '#F3F4F6',
    ring: '#FF7517',
    ...LIGHT_SEMANTIC,
  },
};

const icsDarkTheme: InstituteTheme = {
  code: 'ics',
  name: 'Institute of Computing Studies',
  isDark: true,
  colors: {
    primary: '#FF8A3D',
    primaryHover: '#FFA05C',
    sidebar: '#12151E',
    sidebarMuted: '#1E2230',
    background: '#0F1117',
    surface: '#1A1E29',
    surfaceAlt: '#242938',
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2E3547',
    borderMuted: '#1F2433',
    ring: '#FF8A3D',
    ...DARK_SEMANTIC,
  },
};

const ibeLightTheme: InstituteTheme = {
  code: 'ibe',
  name: 'Institute of Business and Entrepreneurship',
  isDark: false,
  colors: {
    primary: '#D4A017',
    primaryHover: '#E0B84B',
    sidebar: '#2C2727',
    sidebarMuted: '#4A4343',
    background: '#FAF8F1',
    surface: '#FFFFFF',
    surfaceAlt: '#FDFBF7',
    card: '#FFFFFF',
    cardSecondary: '#FDFBF7',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderMuted: '#F3F4F6',
    ring: '#D4A017',
    ...LIGHT_SEMANTIC,
  },
};

const ibeDarkTheme: InstituteTheme = {
  code: 'ibe',
  name: 'Institute of Business and Entrepreneurship',
  isDark: true,
  colors: {
    primary: '#E5B73B',
    primaryHover: '#F0C95C',
    sidebar: '#12151E',
    sidebarMuted: '#1E2230',
    background: '#0F1117',
    surface: '#1A1E29',
    surfaceAlt: '#242938',
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2E3547',
    borderMuted: '#1F2433',
    ring: '#E5B73B',
    ...DARK_SEMANTIC,
  },
};

const iteLightTheme: InstituteTheme = {
  code: 'ite',
  name: 'Institute of Teacher Education',
  isDark: false,
  colors: {
    primary: '#2563EB',
    primaryHover: '#3B82F6',
    sidebar: '#1F2937',
    sidebarMuted: '#374151',
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    card: '#FFFFFF',
    cardSecondary: '#F8FAFC',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderMuted: '#F3F4F6',
    ring: '#2563EB',
    ...LIGHT_SEMANTIC,
  },
};

const iteDarkTheme: InstituteTheme = {
  code: 'ite',
  name: 'Institute of Teacher Education',
  isDark: true,
  colors: {
    primary: '#2563EB',
    primaryHover: '#3B82F6',
    sidebar: '#12151E',
    sidebarMuted: '#1E2230',
    background: '#0F1117',
    surface: '#1A1E29',
    surfaceAlt: '#242938',
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2E3547',
    borderMuted: '#1F2433',
    ring: '#2563EB',
    ...DARK_SEMANTIC,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export function getInstituteTheme(code: string, isDark = false): InstituteTheme {
  const normalized = (code || 'ics').toLowerCase() as InstituteCode;
  if (normalized === 'ibe') return isDark ? ibeDarkTheme : ibeLightTheme;
  if (normalized === 'ite') return isDark ? iteDarkTheme : iteLightTheme;
  return isDark ? icsDarkTheme : icsLightTheme;
}

export const CANONICAL_INSTITUTE_NAMES: Record<InstituteCode, string> = {
  ics: 'Institute of Computing Studies',
  ibe: 'Institute of Business and Entrepreneurship',
  ite: 'Institute of Teacher Education',
};

/**
 * Resolves the canonical institute display name, overriding stale database seed values
 * like "Institute of Technology and Engineering" for ITE.
 */
export function getCanonicalInstituteName(code?: string, fallbackName?: string): string {
  const norm = (code || '').toLowerCase().trim();
  if (norm === 'ics') return CANONICAL_INSTITUTE_NAMES.ics;
  if (norm === 'ibe') return CANONICAL_INSTITUTE_NAMES.ibe;
  if (norm === 'ite') return CANONICAL_INSTITUTE_NAMES.ite;
  if (fallbackName && /technology\s+and\s+engineering/i.test(fallbackName)) {
    return CANONICAL_INSTITUTE_NAMES.ite;
  }
  return fallbackName || CANONICAL_INSTITUTE_NAMES.ics;
}

export const INSTITUTE_LIST = [
  { code: 'ics' as const, name: 'Institute of Computing Studies', short: 'ICS' },
  { code: 'ibe' as const, name: 'Institute of Business and Entrepreneurship', short: 'IBE' },
  { code: 'ite' as const, name: 'Institute of Teacher Education', short: 'ITE' },
];
