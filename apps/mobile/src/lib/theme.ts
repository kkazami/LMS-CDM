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
    card: string;
    cardSecondary: string;
    text: string;
    textSecondary: string;
    border: string;
    ring: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

const BASE_SEMANTIC = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
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
    card: '#FFFFFF',
    cardSecondary: '#F9FAFB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    ring: '#FF7517',
    ...BASE_SEMANTIC,
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
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#2E3547',
    ring: '#FF8A3D',
    ...BASE_SEMANTIC,
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
    card: '#FFFFFF',
    cardSecondary: '#FDFBF7',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    ring: '#D4A017',
    ...BASE_SEMANTIC,
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
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#2E3547',
    ring: '#E5B73B',
    ...BASE_SEMANTIC,
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
    card: '#FFFFFF',
    cardSecondary: '#F8FAFC',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    ring: '#2563EB',
    ...BASE_SEMANTIC,
  },
};

const iteDarkTheme: InstituteTheme = {
  code: 'ite',
  name: 'Institute of Teacher Education',
  isDark: true,
  colors: {
    primary: '#3B82F6',
    primaryHover: '#60A5FA',
    sidebar: '#12151E',
    sidebarMuted: '#1E2230',
    background: '#0F1117',
    card: '#1A1E29',
    cardSecondary: '#242938',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#2E3547',
    ring: '#3B82F6',
    ...BASE_SEMANTIC,
  },
};

export function getInstituteTheme(code: string, isDark = false): InstituteTheme {
  const normalized = (code || 'ics').toLowerCase() as InstituteCode;
  if (normalized === 'ibe') return isDark ? ibeDarkTheme : ibeLightTheme;
  if (normalized === 'ite') return isDark ? iteDarkTheme : iteLightTheme;
  return isDark ? icsDarkTheme : icsLightTheme;
}

export const INSTITUTE_LIST = [
  { code: 'ics' as const, name: 'Institute of Computing Studies', short: 'ICS' },
  { code: 'ibe' as const, name: 'Institute of Business and Entrepreneurship', short: 'IBE' },
  { code: 'ite' as const, name: 'Institute of Teacher Education', short: 'ITE' },
];
