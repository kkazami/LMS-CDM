import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { message: 'Not authenticated.' },
        { status: 401 }
      );
    }

    const user = session.user as Record<string, unknown>;
    const institute = user.institute as Record<string, unknown>;

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        studentNumber: (user.studentNumber as string) || null,
        instituteId: session.user.instituteId,
        institute: {
          code: institute.code as string,
          name: institute.name as string,
        },
      },
    });
  } catch (error) {
    console.error('AUTH_ME_ERROR', error);
    return NextResponse.json(
      { message: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
