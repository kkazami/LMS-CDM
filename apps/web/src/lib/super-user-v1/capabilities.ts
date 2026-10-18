/** Explicit ceilings. Persisted permission strings never create a role. */
export type KnownRole = 'SUPER_USER' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type CanonicalRole = KnownRole | 'UNKNOWN';
export const SUPPORTED_INSTITUTES = ['ics', 'ibe', 'ite'] as const;
export type SupportedInstitute = typeof SUPPORTED_INSTITUTES[number];

export function canonicalRole(value: unknown): CanonicalRole {
  if (typeof value !== 'string') return 'UNKNOWN';
  switch (value.toUpperCase()) {
    case 'SUPER_USER': return 'SUPER_USER';
    case 'ADMIN': return 'ADMIN';
    case 'PROFESSOR': case 'TEACHER': case 'INSTRUCTOR': return 'INSTRUCTOR';
    case 'STUDENT': return 'STUDENT';
    default: return 'UNKNOWN';
  }
}

export function supportedInstitute(value: unknown): SupportedInstitute | null {
  if (typeof value !== 'string') return null;
  const code = value.toLowerCase();
  return SUPPORTED_INSTITUTES.find(candidate => candidate === code) ?? null;
}

export function privilegedRole(role: unknown): boolean {
  const normalized = canonicalRole(role);
  return normalized === 'SUPER_USER' || normalized === 'ADMIN';
}

export function mayAdmitAccount(account: {
  role: unknown; isActive: boolean; credentialProvisioningState?: string | null;
}): boolean {
  const role = canonicalRole(account.role);
  if (role === 'UNKNOWN' || !account.isActive) return false;
  // Existing Administrators keep their credential lifecycle. The database guard
  // forbids creating another ADMIN with null provisioning state.
  if (role === 'ADMIN' && account.credentialProvisioningState == null) return true;
  if (privilegedRole(role)) return account.credentialProvisioningState === 'COMPLETE';
  return account.credentialProvisioningState == null || account.credentialProvisioningState === 'COMPLETE';
}

export function mayUsePublicReset(account: {
  role: unknown; isActive: boolean; credentialProvisioningState?: string | null;
}): boolean {
  const role = canonicalRole(account.role);
  return (role === 'INSTRUCTOR' || role === 'STUDENT') && mayAdmitAccount(account);
}

export function mayUseLegacyApplication(role: unknown): boolean {
  const normalized = canonicalRole(role);
  return normalized === 'ADMIN' || normalized === 'INSTRUCTOR' || normalized === 'STUDENT';
}
