import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401 });
    }

    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });

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
    console.error('AUTH_REFRESH_ERROR', error);
    return NextResponse.json({ message: 'Failed to refresh session.' }, { status: 500 });
  }
}
