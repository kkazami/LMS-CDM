import { mobileCapabilities } from '@/lib/mobile-capabilities';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { needsClassEnrollment } from '@/lib/student-access';

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  corsHeaders['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  corsHeaders['Pragma'] = 'no-cache';

  try {
    const session = await getSessionFromRequest(request, { allowUnenrolled: true });

    if (!session) {
      return NextResponse.json(
        { message: 'Not authenticated.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = session.user as Record<string, unknown>;
    const institute = user.institute as Record<string, unknown>;

    return NextResponse.json(
      {
        mobileCapabilities,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          requiresEnrollment: await needsClassEnrollment(session.user),
          studentNumber: (user.studentNumber as string) || null,
          bio: (user.bio as string) || null, phone: (user.phone as string) || null,
          department: (user.department as string) || null, yearLevel: (user.yearLevel as string) || null,
          avatarUrl: (user.avatarUrl as string) || null, coverColor: (user.coverColor as string) || null,
          instituteId: session.user.instituteId,
          institute: {
            code: (institute?.code as string) || '',
            name: (institute?.name as string) || '',
          },
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('AUTH_ME_ERROR', error);
    return NextResponse.json(
      { message: 'Something went wrong.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
