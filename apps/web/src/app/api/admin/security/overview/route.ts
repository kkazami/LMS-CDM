import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSecurityAdmin } from '@/lib/security-guard';
import { assertMutationOrigin } from '@/lib/super-user-v1/actor';
import { SESSION_IDLE_MS, SESSION_ABSOLUTE_MS, SESSION_TOUCH_MS } from '@/lib/session-policy';
import { RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  assertMutationOrigin(request);

  try {
    const session = await requireSecurityAdmin();
    const isSuperUser = session.isSuperUser;
    const { searchParams } = new URL(request.url);

    let targetInstituteId = session.user.instituteId;
    let targetInstituteCode = '';

    if (isSuperUser) {
      const requestedInstitute = searchParams.get('institute');
      if (requestedInstitute) {
        const inst = await db.institute.findUnique({
          where: { code: requestedInstitute.toLowerCase() },
          select: { id: true, code: true },
        });
        if (!inst) {
          return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
        }
        targetInstituteId = inst.id;
        targetInstituteCode = inst.code;
      } else {
        const inst = await db.institute.findUnique({
          where: { id: targetInstituteId },
          select: { code: true },
        });
        targetInstituteCode = inst?.code ?? 'ics';
      }
    } else {
      // For regular ADMIN: strictly ignore URL/body institute and always use session institute
      const inst = await db.institute.findUnique({
        where: { id: targetInstituteId },
        select: { code: true },
      });
      targetInstituteCode = inst?.code ?? '';
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Concurrently fetch real, verified metrics
    const [
      activeSessionsCount,
      suspendedAccountsCount,
      totalUsersCount,
      pinProtectedUsersCount,
      recentSecurityEventsCount,
    ] = await Promise.all([
      // 1. Active, non-expired sessions for users in this institute
      db.session.count({
        where: {
          user: { instituteId: targetInstituteId },
          expiresAt: { gt: now },
        },
      }),

      // 2. Suspended accounts in this institute
      db.user.count({
        where: {
          instituteId: targetInstituteId,
          isActive: false,
        },
      }),

      // 3. Total accounts in this institute
      db.user.count({
        where: {
          instituteId: targetInstituteId,
        },
      }),

      // 4. Accounts in this institute with a configured Security PIN
      db.user.count({
        where: {
          instituteId: targetInstituteId,
          isActive: true,
          securityPin: {
            not: null,
          },
        },
      }),

      // 5. Security audit log events in the last 7 days
      db.auditLog.count({
        where: {
          OR: [
            { admin: { instituteId: targetInstituteId } },
            { target: { instituteId: targetInstituteId } },
          ],
          action: {
            in: [
              'ACCOUNT_SUSPENSION',
              'ACCOUNT_REACTIVATION',
              'PASSWORD_RESET',
              'SESSION_REVOCATION',
              'ROLE_CHANGE',
              'PERMISSION_CHANGE',
            ],
          },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const pinAdoptionRate = totalUsersCount > 0
      ? Math.round((pinProtectedUsersCount / totalUsersCount) * 100)
      : 0;

    return NextResponse.json({
      overview: {
        instituteCode: targetInstituteCode,
        activeSessionsCount,
        suspendedAccountsCount,
        totalUsersCount,
        pinProtectedUsersCount,
        pinAdoptionRate,
        recentSecurityEventsCount,
      },
      policies: {
        sessionIdleTimeoutMinutes: Math.round(SESSION_IDLE_MS / 60000),
        sessionAbsoluteExpiryDays: Math.round(SESSION_ABSOLUTE_MS / (24 * 60 * 60 * 1000)),
        sessionTouchIntervalMinutes: Math.round(SESSION_TOUCH_MS / 60000),
        rateLimits: {
          loginAccountMax: RATE_LIMIT_CONFIG.loginAccount.maxRequests,
          loginAccountWindowMinutes: Math.round(RATE_LIMIT_CONFIG.loginAccount.windowMs / 60000),
          loginIpMax: RATE_LIMIT_CONFIG.loginIp.maxRequests,
          loginIpWindowMinutes: Math.round(RATE_LIMIT_CONFIG.loginIp.windowMs / 60000),
          passwordResetMax: RATE_LIMIT_CONFIG.passwordReset.maxRequests,
          passwordResetWindowMinutes: Math.round(RATE_LIMIT_CONFIG.passwordReset.windowMs / 60000),
          fileUploadMax: RATE_LIMIT_CONFIG.fileUpload.maxRequests,
          fileUploadWindowMinutes: Math.round(RATE_LIMIT_CONFIG.fileUpload.windowMs / 60000),
        },
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
