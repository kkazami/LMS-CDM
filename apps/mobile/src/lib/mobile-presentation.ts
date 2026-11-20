/** Presentation only: this never grants access or changes session verification. */
export function selectMobilePresentation(auth: {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: { id: string; role: string; institute: { code: string } } | null;
}, subtree: 'student' | 'teacher', enabled: boolean): 'ics' | 'default' {
  if (!enabled || auth.isLoading || !auth.isAuthenticated || !auth.token || !auth.user) return 'default';
  const role = auth.user.role.trim().toUpperCase();
  const matchesRole = subtree === 'student' ? role === 'STUDENT' : role === 'PROFESSOR' || role === 'TEACHER';
  return auth.user.institute.code.trim().toLowerCase() === 'ics' && matchesRole ? 'ics' : 'default';
}

export const icsPresentation = {
  radius: 22,
  controlRadius: 16,
  gutter: 20,
  accent: { light: '#B84400', dark: '#FFAE79' },
  tint: { light: '#FFF0E5', dark: '#382419' },
  motion: { press: 120, transition: 220, stagger: 45 },
} as const;

/** Brand fills stay orange; foreground text uses the matching accessible ink. */
export function icsTextInk(color: unknown, dark: boolean): string | undefined {
  if (typeof color !== 'string') return undefined;
  return ['#ff7517', '#ff8a3d'].includes(color.toLowerCase()) ? icsPresentation.accent[dark ? 'dark' : 'light'] : undefined;
}
