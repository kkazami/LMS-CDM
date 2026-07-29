export type InstituteCode = 'ics' | 'ibe' | 'ite';

export interface InstituteTheme {
  code: InstituteCode;
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    sidebar: string;
    sidebarMuted: string;
    background: string;
    card: string;
    text: string;
    border: string;
    ring: string;
  };
}

const icsTheme: InstituteTheme = {
  code: 'ics',
  name: 'Institute of Computing Studies',
  colors: {
    primary: '#FF7517',
    primaryHover: '#FC8236',
    sidebar: '#2C2727',
    sidebarMuted: '#3E3939',
    background: '#F6F4F4',
    card: '#FFFFFF',
    text: '#2C2727',
    border: '#D1D5DB',
    ring: '#FF7517',
  },
};

const ibeTheme: InstituteTheme = {
  code: 'ibe',
  name: 'Institute of Business and Entrepreneurship',
  colors: {
    primary: '#D4A017',
    primaryHover: '#E0B84B',
    sidebar: '#2C2727',
    sidebarMuted: '#4A4343',
    background: '#FAF8F1',
    card: '#FFFFFF',
    text: '#2C2727',
    border: '#D1D5DB',
    ring: '#D4A017',
  },
};

const iteTheme: InstituteTheme = {
  code: 'ite',
  name: 'Institute of Teacher Education',
  colors: {
    primary: '#2563EB',
    primaryHover: '#3B82F6',
    sidebar: '#1F2937',
    sidebarMuted: '#374151',
    background: '#F5F7FB',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#D1D5DB',
    ring: '#2563EB',
  },
};

const THEMES: Record<InstituteCode, InstituteTheme> = {
  ics: icsTheme,
  ibe: ibeTheme,
  ite: iteTheme,
};

export function getInstituteTheme(code: string): InstituteTheme {
  const normalized = code.toLowerCase() as InstituteCode;
  return THEMES[normalized] ?? icsTheme;
}

export const INSTITUTE_LIST = [
  { code: 'ics' as const, name: 'Institute of Computing Studies', short: 'ICS' },
  { code: 'ibe' as const, name: 'Institute of Business and Entrepreneurship', short: 'IBE' },
  { code: 'ite' as const, name: 'Institute of Teacher Education', short: 'ITE' },
];
