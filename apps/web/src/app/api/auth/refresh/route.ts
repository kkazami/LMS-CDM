import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { sessionDeadline } from '@/lib/session-policy';
import { assertMutationOrigin } from '@/lib/super-user-v1/actor';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST auth/refresh/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 });
    }

    assertMutationOrigin(request);
    const newExpiresAt = sessionDeadline(session);

    const user = session.user as Record<string, unknown>;
    const institute = user.institute as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      expiresAt: newExpiresAt.toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        studentNumber: (user.studentNumber as string) || null,
        instituteId: session.user.instituteId,
        institute: {
          code: (institute?.code as string) || 'ics',
          name: (institute?.name as string) || 'Institute',
        },
      },
    });
  } catch (error) {
    console.warn('AUTH_REFRESH_UNAVAILABLE');
    return NextResponse.json({ message: 'Failed to refresh session.' }, { status: 500 });
  }
}
