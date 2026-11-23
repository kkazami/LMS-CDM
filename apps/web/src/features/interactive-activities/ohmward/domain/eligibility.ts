import { canonicalRole } from '@/lib/super-user-v1/capabilities';
export function ohmwardDestination(institute: string, role: string): string | null {
  const normalized = canonicalRole(role);
  if (institute.toLowerCase() !== 'ics' || (normalized !== 'STUDENT' && normalized !== 'INSTRUCTOR')) return null;
  return normalized === 'STUDENT' ? '/ics/activities/ohmward' : '/ics/activities/ohmward/instructor';
}
