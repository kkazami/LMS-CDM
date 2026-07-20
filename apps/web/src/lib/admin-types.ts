/**
 * Admin System Type Definitions
 *
 * Central TypeScript interfaces for User Management, RBAC, and Audit logging.
 * These types are used across API routes, UI components, and agentic skills.
 */

// ─── Role System ───

export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

/**
 * Maps DB role strings (which may include legacy names like PROFESSOR/TEACHER)
 * to the canonical UserRole union.
 */
export function normalizeRole(role: string): UserRole {
  const r = role.toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'PROFESSOR' || r === 'TEACHER' || r === 'INSTRUCTOR') return 'INSTRUCTOR';
  return 'STUDENT';
}

// ─── User Types ───

export interface LMSUser {
  id: string;
  email: string;
  name: string;
  uniqueId: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  instituteCode?: string;
}

// ─── Audit Types ───

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName?: string;
  targetId: string;
  targetName?: string;
  action: string;
  ipAddress: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Pagination ───

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Permission System ───

export const SYSTEM_PERMISSIONS = [
  'course:create',
  'course:archive',
  'user:modify',
  'grade:export',
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];

/** Default permissions assigned when a user is created or their role changes */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  ADMIN: ['course:create', 'course:archive', 'user:modify', 'grade:export'],
  INSTRUCTOR: ['course:create', 'grade:export'],
  STUDENT: [],
};

// ─── Audit Action Constants ───

export const AUDIT_ACTIONS = {
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED: 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_SUSPENSION: 'ACCOUNT_SUSPENSION',
  ACCOUNT_REACTIVATION: 'ACCOUNT_REACTIVATION',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  BULK_IMPORT: 'BULK_IMPORT',
  PERMISSION_MATRIX_UPDATE: 'PERMISSION_MATRIX_UPDATE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
