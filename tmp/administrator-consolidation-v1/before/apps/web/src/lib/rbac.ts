/**
 * Role-Based Access Control (RBAC) Module
 *
 * Provides permission checking, role normalization, session guards,
 * and re-authentication utilities for the admin system.
 */

import { db } from './db';
import { getSession } from './auth-session';
import { compare } from 'bcryptjs';
import {
  normalizeRole,
  DEFAULT_ROLE_PERMISSIONS,
  type UserRole,
  type SystemPermission,
} from './admin-types';

// Re-export for convenience
export { normalizeRole } from './admin-types';

// ─── Permission Helpers ───

/**
 * Parses the JSON permissions string stored in the database.
 * Returns an empty array on parse failure.
 */
export function parsePermissions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a user's permission array includes the required permission.
 */
export function hasPermission(
  permissions: string[],
  required: SystemPermission
): boolean {
  return permissions.includes(required);
}

/**
 * Returns the default permission set for a given role.
 */
export function getDefaultPermissions(role: UserRole): SystemPermission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

// ─── Session Guards ───

export interface AdminSession {
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    permissions: string;
    instituteId: string;
  };
}

/**
 * Validates the current session and returns it.
 * Returns null if no valid session exists.
 */
export async function getValidSession(): Promise<AdminSession | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      isActive: (session.user as Record<string, unknown>).isActive !== false,
      permissions: ((session.user as Record<string, unknown>).permissions as string) ?? '[]',
      instituteId: session.user.instituteId,
    },
  };
}

/**
 * Requires the current user to be an authenticated ADMIN.
 * Returns the session or throws a Response-compatible error object.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getValidSession();

  if (!session) {
    throw { status: 401, message: 'Authentication required.' };
  }

  const role = normalizeRole(session.user.role);
  if (role !== 'ADMIN') {
    throw { status: 403, message: 'Forbidden: Admin access required.' };
  }

  if (!session.user.isActive) {
    throw { status: 403, message: 'Your account has been deactivated. Please contact administration.' };
  }

  return session;
}

/**
 * Requires the current user to have a specific permission.
 */
export async function requirePermission(
  permission: SystemPermission
): Promise<AdminSession> {
  const session = await getValidSession();

  if (!session) {
    throw { status: 401, message: 'Authentication required.' };
  }

  if (!session.user.isActive) {
    throw { status: 403, message: 'Your account has been deactivated. Please contact administration.' };
  }

  const role = normalizeRole(session.user.role);
  if (role === 'ADMIN') return session; // Admins always pass

  const userPermissions = parsePermissions(session.user.permissions);
  if (!hasPermission(userPermissions, permission)) {
    throw { status: 403, message: `Forbidden: Missing permission '${permission}'.` };
  }

  return session;
}

/**
 * Re-authentication check for sensitive operations (e.g., role changes).
 * Requires the admin to provide their current password.
 */
export async function requireReAuth(
  adminId: string,
  password: string
): Promise<boolean> {
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: { password: true },
  });

  if (!admin) {
    throw { status: 404, message: 'Admin user not found.' };
  }

  const valid = await compare(password, admin.password);
  if (!valid) {
    throw { status: 401, message: 'Re-authentication failed. Incorrect password.' };
  }

  return true;
}

// ─── Audit Logging ───

/**
 * Creates an immutable audit log entry.
 */
export async function createAuditLog(params: {
  adminId: string;
  targetId: string;
  action: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      targetId: params.targetId,
      action: params.action,
      ipAddress: params.ipAddress ?? '',
      metadata: params.metadata ? JSON.stringify(params.metadata) : '{}',
    },
  });
}

/**
 * Extracts the client IP address from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp ?? '127.0.0.1';
}
