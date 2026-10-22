import { getInstituteName } from "@lms/types";
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
/**
 * Admin Single User API — Get, Update, Delete
 *
 * GET    /api/admin/users/[userId] — Fetch single user profile
 * PATCH  /api/admin/users/[userId] — Update user fields
 * DELETE /api/admin/users/[userId] — Deactivate user
 */

import { administratorInstitute } from '@/lib/administrator-scope';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rosterActor, adminTransaction, rosterError, audit, setStudentProgram } from '@/lib/roster/policy';
import { STUDENT_SCHEMA, normalizeCode } from '@/lib/roster/csv';
import { AccessError } from '@/lib/super-user-v1/actor';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
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
  const ceilingDenial = await denyLegacyApi(request, "GET admin/users/[userId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
        instituteName: getInstituteName(user.institute.code, user.institute.name),
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
  const ceilingDenial = await denyLegacyApi(request, "PATCH admin/users/[userId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await requireAdmin();
    const { userId } = await context.params;
    const body = await request.json();

    const { name, email, uniqueId, instituteCode } = body as {
      name?: string;
      email?: string;
      uniqueId?: string;
      instituteCode?: string;
    };

    // Check user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, uniqueId: true, studentNumber: true, activationStatus: true, role: true },
    });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    if (existingUser.role.toUpperCase() === 'STUDENT') {
      const actor = await rosterActor(request);
      const input = body as Record<string, unknown>;
      if ((input.studentNumber !== undefined && input.studentNumber !== existingUser.studentNumber) || (uniqueId !== undefined && uniqueId !== existingUser.uniqueId)) throw new AccessError(400, 'Student ID cannot be changed through profile editing.');
      const parsed = STUDENT_SCHEMA.safeParse({ student_Id: existingUser.studentNumber ?? existingUser.uniqueId, first_name: input.first_name, last_name: input.last_name, email: email ?? existingUser.email, program: input.program, section: input.section });
      if (!parsed.success) throw new AccessError(400, 'Provide first name, last name, program, section, and a valid email.');
      await adminTransaction(actor, async tx => {
        await lockAccounts(tx, [userId]);
        const current = await tx.user.findFirst({ where: { id: userId, instituteId: actor.instituteId, role: { equals: 'STUDENT', mode: 'insensitive' } } });
        if (!current) throw new AccessError(404, 'Student not found.');
        if (parsed.data.email !== current.email && current.activationStatus === 'PENDING_ACTIVATION') throw new AccessError(409, 'Use Correct Email in Account Invitations to revoke existing links safely.');
        const programs = await tx.academicProgram.findMany({ where: { instituteId: actor.instituteId, isActive: true, code: { equals: parsed.data.program, mode: 'insensitive' } } });
        if (programs.length !== 1) throw new AccessError(400, 'Choose an active program in your institute.');
        await tx.user.update({ where: { id: userId }, data: { firstName: parsed.data.first_name, lastName: parsed.data.last_name, name: parsed.data.first_name + ' ' + parsed.data.last_name, section: normalizeCode(parsed.data.section), email: parsed.data.email } });
        const membership = await tx.programMembership.findUnique({ where: { programId_userId: { programId: programs[0].id, userId } } });
        if (!membership?.isActive) await setStudentProgram(tx, actor, userId, programs[0].id);
        if (parsed.data.email !== current.email) await tx.session.deleteMany({ where: { userId } });
        await audit(tx, actor.id, userId, 'STUDENT_PROFILE_UPDATED', { programId: programs[0].id, section: parsed.data.section });
      });
      return NextResponse.json({ message: 'Student updated.' });
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

    if (instituteCode) {
      await administratorInstitute(session.user, instituteCode);
      const inst = await db.institute.findUnique({
        where: { code: instituteCode.toLowerCase() },
      });
      if (inst) {
        updateData.instituteId = inst.id;
      }
    }

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
    if (err instanceof AccessError) return rosterError(err);
    const error = err as { status?: number; message?: string };
    console.error('ADMIN_UPDATE_USER_ERROR', err);
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "DELETE admin/users/[userId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
