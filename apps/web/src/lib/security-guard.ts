import { getValidSession, type AdminSession } from '@/lib/rbac';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';

export interface SecurityAdminSession extends AdminSession {
  isSuperUser: boolean;
}

/**
 * Security Tools Dedicated Access Guard
 *
 * Dedicated strictly to the Security Tools page and its API endpoints.
 * Authorizes both institute administrators (ADMIN) and platform super-users (SUPER_USER),
 * preserving the strict global requireAdmin() check across all other admin endpoints.
 */
export async function requireSecurityAdmin(): Promise<SecurityAdminSession> {
  const session = await getValidSession();

  if (!session) {
    throw { status: 401, message: 'Authentication required.' };
  }

  const role = canonicalRole(session.user.role);
  if (role !== 'ADMIN' && role !== 'SUPER_USER') {
    throw { status: 403, message: 'Forbidden: Admin access required.' };
  }

  if (!session.user.isActive) {
    throw { status: 403, message: 'Your account has been deactivated. Please contact administration.' };
  }

  return {
    ...session,
    isSuperUser: role === 'SUPER_USER',
  };
}
