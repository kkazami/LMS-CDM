import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog, getClientIp } from '@/lib/rbac';
import { requireSecurityAdmin } from '@/lib/security-guard';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { assertMutationOrigin } from '@/lib/super-user-v1/actor';
import { SESSION_IDLE_MS } from '@/lib/session-policy';
import { AUDIT_ACTIONS, normalizeRole } from '@/lib/admin-types';
import { persistentLimit } from '@/lib/roster/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  assertMutationOrigin(request);

  try {
    const session = await requireSecurityAdmin();
    const isSuperUser = session.isSuperUser;
    const { searchParams } = new URL(request.url);

    let targetInstituteId = session.user.instituteId;

    if (isSuperUser) {
      const requestedInstitute = searchParams.get('institute');
      if (requestedInstitute) {
        const inst = await db.institute.findUnique({
          where: { code: requestedInstitute.toLowerCase() },
          select: { id: true },
        });
        if (!inst) {
          return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
        }
        targetInstituteId = inst.id;
      }
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const search = searchParams.get('search')?.trim() ?? '';
    const roleFilter = searchParams.get('role')?.trim() ?? '';
    const statusFilter = searchParams.get('status')?.trim().toLowerCase() ?? 'all';

    const now = new Date();
    const idleThreshold = new Date(now.getTime() - SESSION_IDLE_MS);

    // Build Prisma query condition
    const where: Record<string, unknown> = {
      expiresAt: { gt: now },
      user: {
        instituteId: targetInstituteId,
      },
    };

    if (search) {
      where.user = {
        ...(where.user as Record<string, unknown>),
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (roleFilter && roleFilter !== 'ALL') {
      const canonical = roleFilter.toUpperCase();
      const roleVariants = canonical === 'INSTRUCTOR'
        ? ['INSTRUCTOR', 'TEACHER', 'PROFESSOR']
        : [canonical];
      where.user = {
        ...(where.user as Record<string, unknown>),
        role: { in: roleVariants },
      };
    }

    if (statusFilter === 'active') {
      where.lastSeenAt = { gte: idleThreshold };
    } else if (statusFilter === 'idle') {
      where.lastSeenAt = { lt: idleThreshold };
    }

    // Execute paginated query (CRITICAL: NEVER SELECT tokenHash)
    const [total, sessions] = await db.$transaction([
      db.session.count({ where }),
      db.session.findMany({
        where,
        select: {
          id: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          lastSeenAt: true,
          createdAt: true,
          expiresAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              securityPin: true,
              institute: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      userRole: normalizeRole(s.user.role),
      userIsActive: s.user.isActive,
      hasSecurityPin: Boolean(s.user.securityPin),
      instituteCode: s.user.institute?.code ?? '',
      instituteName: s.user.institute?.name ?? '',
      ipAddress: s.ipAddress || 'Unknown IP',
      userAgent: s.userAgent || 'Unknown Device',
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrentSession: s.id === session.sessionId,
      isIdle: s.lastSeenAt.getTime() + SESSION_IDLE_MS <= now.getTime(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}

export async function DELETE(request: Request) {
  assertMutationOrigin(request);

  try {
    const session = await requireSecurityAdmin();
    const isSuperUser = session.isSuperUser;
    const body = await request.json().catch(() => ({}));
    const clientIp = getClientIp(request);

    const { sessionId, targetUserId, instituteWide, confirmation } = body as {
      sessionId?: string;
      targetUserId?: string;
      instituteWide?: boolean;
      confirmation?: string;
    };

    // Mode 1: Revoke all sessions in the institute (Emergency lockout)
    if (instituteWide) {
      if (!confirmation || confirmation.trim().toUpperCase() !== 'REVOKE ALL') {
        return NextResponse.json(
          { message: 'Confirmation mismatch. Type "REVOKE ALL" to confirm this emergency action.' },
          { status: 400 }
        );
      }

      // Rate limit institute-wide revocation to prevent denial of service (max 3 times per minute)
      await persistentLimit(`revoke-all-sessions:${session.user.id}`, 3, 60000);

      const targetInstituteId = session.user.instituteId;

      // Revoke all sessions in the institute, EXCLUDING the admin's own current session
      // and preserving any SUPER_USER sessions if acting admin is not a super user
      const where: Record<string, unknown> = {
        id: { not: session.sessionId },
        user: {
          instituteId: targetInstituteId,
          ...(isSuperUser ? {} : { role: { not: 'SUPER_USER' } }),
        },
      };

      const result = await db.session.deleteMany({ where });

      await createAuditLog({
        adminId: session.user.id,
        targetId: session.user.id,
        action: AUDIT_ACTIONS.SESSION_REVOCATION,
        ipAddress: clientIp,
        metadata: {
          scope: 'INSTITUTE',
          instituteId: targetInstituteId,
          revokedCount: result.count,
          preservedSessionId: session.sessionId,
        },
      });

      return NextResponse.json({
        message: `Successfully revoked ${result.count} active sessions. Your current session remains active.`,
        revokedCount: result.count,
      });
    }

    // Mode 2: Revoke all sessions for a specific target user
    if (targetUserId) {
      if (targetUserId === session.user.id) {
        return NextResponse.json(
          { message: 'Cannot revoke your own sessions here. Use logout instead.' },
          { status: 400 }
        );
      }

      const targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true, role: true, instituteId: true },
      });

      if (!targetUser) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      // Institute boundary: non-super users cannot touch users in other institutes
      if (!isSuperUser && targetUser.instituteId !== session.user.instituteId) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      // Hierarchy rule: regular admin cannot revoke super user sessions
      if (!isSuperUser && canonicalRole(targetUser.role) === 'SUPER_USER') {
        return NextResponse.json(
          { message: 'Cannot revoke sessions of a super user.' },
          { status: 403 }
        );
      }

      const result = await db.session.deleteMany({
        where: { userId: targetUserId },
      });

      await createAuditLog({
        adminId: session.user.id,
        targetId: targetUserId,
        action: AUDIT_ACTIONS.SESSION_REVOCATION,
        ipAddress: clientIp,
        metadata: {
          scope: 'USER',
          targetUserId,
          targetEmail: targetUser.email,
          revokedCount: result.count,
        },
      });

      return NextResponse.json({
        message: `Revoked all ${result.count} sessions for ${targetUser.name}.`,
        revokedCount: result.count,
      });
    }

    // Mode 3: Revoke a single specific session
    if (sessionId) {
      if (sessionId === session.sessionId) {
        return NextResponse.json(
          { message: 'Cannot revoke your own active session. Use logout instead.' },
          { status: 400 }
        );
      }

      const targetSession = await db.session.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, instituteId: true },
          },
        },
      });

      if (!targetSession) {
        return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
      }

      // Institute boundary check
      if (!isSuperUser && targetSession.user.instituteId !== session.user.instituteId) {
        return NextResponse.json({ message: 'Session not found.' }, { status: 404 });
      }

      // Hierarchy rule
      if (!isSuperUser && canonicalRole(targetSession.user.role) === 'SUPER_USER') {
        return NextResponse.json(
          { message: 'Cannot revoke sessions of a super user.' },
          { status: 403 }
        );
      }

      await db.session.delete({
        where: { id: sessionId },
      });

      await createAuditLog({
        adminId: session.user.id,
        targetId: targetSession.user.id,
        action: AUDIT_ACTIONS.SESSION_REVOCATION,
        ipAddress: clientIp,
        metadata: {
          scope: 'SINGLE',
          sessionId,
          targetUserId: targetSession.user.id,
          targetEmail: targetSession.user.email,
        },
      });

      return NextResponse.json({
        message: 'Session revoked successfully.',
      });
    }

    return NextResponse.json(
      { message: 'Provide sessionId, targetUserId, or instituteWide to revoke sessions.' },
      { status: 400 }
    );
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
