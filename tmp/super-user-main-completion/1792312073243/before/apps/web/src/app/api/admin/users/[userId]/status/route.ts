/**
 * Admin Account Status API — Activate / Suspend
 *
 * PATCH /api/admin/users/[userId]/status
 *
 * Toggling to suspended instantly purges all active sessions.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  requireAdmin,
  createAuditLog,
  getClientIp,
} from '@/lib/rbac';
import { AUDIT_ACTIONS } from '@/lib/admin-types';

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const { userId } = await context.params;
    const body = await request.json();

    const { isActive } = body as { isActive?: boolean };

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: 'isActive (boolean) is required.' },
        { status: 400 }
      );
    }

    // Prevent self-suspension
    if (userId === session.user.id && !isActive) {
      return NextResponse.json(
        { message: 'Cannot suspend your own account.' },
        { status: 400 }
      );
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (targetUser.isActive === isActive) {
      return NextResponse.json(
        { message: `User is already ${isActive ? 'active' : 'suspended'}.` },
        { status: 400 }
      );
    }

    if (!isActive) {
      // SUSPENSION: deactivate + purge ALL sessions immediately
      await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { isActive: false },
        }),
        db.session.deleteMany({ where: { userId } }),
      ]);

      await createAuditLog({
        adminId: session.user.id,
        targetId: userId,
        action: AUDIT_ACTIONS.ACCOUNT_SUSPENSION,
        ipAddress: getClientIp(request),
        metadata: { email: targetUser.email, name: targetUser.name },
      });

      return NextResponse.json({
        message: 'Account suspended. All active sessions have been terminated.',
      });
    } else {
      // REACTIVATION
      await db.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      await createAuditLog({
        adminId: session.user.id,
        targetId: userId,
        action: AUDIT_ACTIONS.ACCOUNT_REACTIVATION,
        ipAddress: getClientIp(request),
        metadata: { email: targetUser.email, name: targetUser.name },
      });

      return NextResponse.json({
        message: 'Account reactivated successfully.',
      });
    }
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_STATUS_CHANGE_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
