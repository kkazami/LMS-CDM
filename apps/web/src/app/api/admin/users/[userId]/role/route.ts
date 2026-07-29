/**
 * Admin Role Change API — Re-authenticated role escalation
 *
 * PATCH /api/admin/users/[userId]/role
 *
 * Requires admin re-authentication (password) to prevent unauthorized role escalation.
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
  normalizeRole,
  DEFAULT_ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
  type UserRole,
} from '@/lib/admin-types';

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const VALID_ROLES: UserRole[] = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const { userId } = await context.params;
    const body = await request.json();

    const { newRole, adminPassword } = body as {
      newRole?: string;
      adminPassword?: string;
    };

    if (!newRole || !adminPassword) {
      return NextResponse.json(
        { message: 'newRole and adminPassword are required.' },
        { status: 400 }
      );
    }

    const normalizedNewRole = normalizeRole(newRole);
    if (!VALID_ROLES.includes(normalizedNewRole)) {
      return NextResponse.json(
        { message: `Invalid role: ${newRole}. Must be ADMIN, INSTRUCTOR, or STUDENT.` },
        { status: 400 }
      );
    }

    // Re-authenticate the admin
    await requireReAuth(session.user.id, adminPassword);

    // Prevent self-role-change
    if (userId === session.user.id) {
      return NextResponse.json(
        { message: 'Cannot change your own role.' },
        { status: 400 }
      );
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const oldRole = normalizeRole(targetUser.role);
    if (oldRole === normalizedNewRole) {
      return NextResponse.json(
        { message: `User already has role ${normalizedNewRole}.` },
        { status: 400 }
      );
    }

    // Map to DB role string
    const dbRole = normalizedNewRole === 'INSTRUCTOR' ? 'PROFESSOR' : normalizedNewRole;
    const newPermissions = DEFAULT_ROLE_PERMISSIONS[normalizedNewRole];

    // Update role, permissions, and purge sessions (force re-login)
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          role: dbRole,
          permissions: JSON.stringify(newPermissions),
        },
      }),
      db.session.deleteMany({ where: { userId } }),
    ]);

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: userId,
      action: `${AUDIT_ACTIONS.ROLE_CHANGE}_TO_${normalizedNewRole}`,
      ipAddress: getClientIp(request),
      metadata: {
        previousRole: oldRole,
        newRole: normalizedNewRole,
        targetEmail: targetUser.email,
      },
    });

    return NextResponse.json({
      message: `Role changed from ${oldRole} to ${normalizedNewRole}. User sessions have been purged.`,
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_ROLE_CHANGE_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
