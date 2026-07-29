/**
 * Admin Single User API — Get, Update, Delete
 *
 * GET    /api/admin/users/[userId] — Fetch single user profile
 * PATCH  /api/admin/users/[userId] — Update user fields
 * DELETE /api/admin/users/[userId] — Deactivate user
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  requireAdmin,
  createAuditLog,
  getClientIp,
  parsePermissions,
} from '@/lib/rbac';
import { normalizeRole, AUDIT_ACTIONS } from '@/lib/admin-types';

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { userId } = await context.params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        uniqueId: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        institute: { select: { code: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        uniqueId: user.uniqueId,
        role: normalizeRole(user.role),
        isActive: user.isActive,
        permissions: parsePermissions(user.permissions),
        createdAt: user.createdAt.toISOString(),
        instituteCode: user.institute.code,
        instituteName: user.institute.name,
      },
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const { userId } = await context.params;
    const body = await request.json();

    const { name, email, uniqueId } = body as {
      name?: string;
      email?: string;
      uniqueId?: string;
    };

    // Check user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, uniqueId: true },
    });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // If email is changing, check for duplicates
    if (email && email.toLowerCase() !== existingUser.email) {
      const duplicate = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (duplicate) {
        return NextResponse.json(
          { message: 'Email is already in use by another account.' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (uniqueId !== undefined) updateData.uniqueId = uniqueId;

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        uniqueId: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        institute: { select: { code: true } },
      },
    });

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: userId,
      action: AUDIT_ACTIONS.ACCOUNT_UPDATED,
      ipAddress: getClientIp(request),
      metadata: { changes: updateData },
    });

    return NextResponse.json({
      message: 'User updated successfully.',
      user: {
        ...updated,
        role: normalizeRole(updated.role),
        permissions: parsePermissions(updated.permissions),
        createdAt: updated.createdAt.toISOString(),
        instituteCode: updated.institute.code,
      },
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_UPDATE_USER_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const { userId } = await context.params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { message: 'Cannot delete your own account.' },
        { status: 400 }
      );
    }

    // Soft-delete: deactivate and purge sessions
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      db.session.deleteMany({ where: { userId } }),
    ]);

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: userId,
      action: AUDIT_ACTIONS.ACCOUNT_DELETED,
      ipAddress: getClientIp(request),
      metadata: { email: user.email, name: user.name },
    });

    return NextResponse.json({ message: 'User deactivated successfully.' });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_DELETE_USER_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
