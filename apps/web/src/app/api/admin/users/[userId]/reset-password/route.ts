/**
 * Admin Password Reset API
 *
 * POST /api/admin/users/[userId]/reset-password
 *
 * Generates a new temporary password, hashes it, purges sessions,
 * and returns the plaintext password once for admin to share.
 */

import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
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

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireAdmin();
    const { userId } = await context.params;

    // Optionally accept a specific password from admin
    let body: { newPassword?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — we'll auto-generate
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Generate or use provided password
    const rawPassword = body.newPassword ?? generateSecurePassword();

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(rawPassword, 10);

    // Update password and purge all sessions
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      db.session.deleteMany({ where: { userId } }),
    ]);

    // Audit log
    await createAuditLog({
      adminId: session.user.id,
      targetId: userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      ipAddress: getClientIp(request),
      metadata: {
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        method: body.newPassword ? 'admin-specified' : 'auto-generated',
      },
    });

    return NextResponse.json({
      message: 'Password reset successfully. Share this temporary password securely.',
      temporaryPassword: rawPassword,
      note: 'This password is shown only once. The user should change it upon next login.',
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_PASSWORD_RESET_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
