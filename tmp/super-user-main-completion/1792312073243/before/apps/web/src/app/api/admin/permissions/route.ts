/**
 * Admin Permissions Matrix API
 *
 * GET /api/admin/permissions — Returns current permission matrix
 * PUT /api/admin/permissions — Updates permission defaults (re-auth required)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  requireAdmin,
  requireReAuth,
  createAuditLog,
  getClientIp,
} from '@/lib/rbac';
import {
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
  type UserRole,
  type SystemPermission,
} from '@/lib/admin-types';

export const dynamic = "force-dynamic";

// In-memory mutable copy of permission defaults
// In production, this would be stored in the database
let currentPermissionMatrix: Record<UserRole, SystemPermission[]> = {
  ...DEFAULT_ROLE_PERMISSIONS,
};

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      permissions: SYSTEM_PERMISSIONS,
      matrix: currentPermissionMatrix,
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { matrix, adminPassword } = body as {
      matrix?: Record<string, string[]>;
      adminPassword?: string;
    };

    if (!matrix || !adminPassword) {
      return NextResponse.json(
        { message: 'matrix and adminPassword are required.' },
        { status: 400 }
      );
    }

    // Re-authenticate
    await requireReAuth(session.user.id, adminPassword);

    // Validate the matrix structure
    const validRoles: UserRole[] = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
    const validPerms = new Set<string>(SYSTEM_PERMISSIONS);

    for (const role of validRoles) {
      if (!matrix[role] || !Array.isArray(matrix[role])) {
        return NextResponse.json(
          { message: `Missing permission array for role: ${role}` },
          { status: 400 }
        );
      }

      for (const perm of matrix[role]) {
        if (!validPerms.has(perm)) {
          return NextResponse.json(
            { message: `Invalid permission: ${perm}` },
            { status: 400 }
          );
        }
      }
    }

    // Store the previous matrix for audit
    const previousMatrix = { ...currentPermissionMatrix };

    // Update the matrix
    currentPermissionMatrix = {
      ADMIN: matrix.ADMIN as SystemPermission[],
      INSTRUCTOR: matrix.INSTRUCTOR as SystemPermission[],
      STUDENT: matrix.STUDENT as SystemPermission[],
    };

    // Update all existing users' permissions based on their role
    for (const role of validRoles) {
      const dbRole = role === 'INSTRUCTOR' ? 'PROFESSOR' : role;
      const roleVariants = role === 'INSTRUCTOR'
        ? ['PROFESSOR', 'TEACHER', 'INSTRUCTOR']
        : [role];

      await db.user.updateMany({
        where: { role: { in: roleVariants } },
        data: { permissions: JSON.stringify(currentPermissionMatrix[role]) },
      });
    }

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: session.user.id,
      action: AUDIT_ACTIONS.PERMISSION_MATRIX_UPDATE,
      ipAddress: getClientIp(request),
      metadata: {
        previousMatrix,
        newMatrix: currentPermissionMatrix,
      },
    });

    return NextResponse.json({
      message: 'Permission matrix updated successfully.',
      matrix: currentPermissionMatrix,
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_PERMISSION_UPDATE_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
