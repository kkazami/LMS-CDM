import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { institute: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentNumber: (user as Record<string, unknown>).studentNumber || null,
        instituteId: user.instituteId,
        institute: {
          code: user.institute.code,
          name: user.institute.name,
        },
      },
    });
  } catch (error) {
    console.error('PROFILE_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { ...(name ? { name } : {}) },
      include: { institute: true },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        studentNumber: (updated as Record<string, unknown>).studentNumber || null,
        instituteId: updated.instituteId,
        institute: {
          code: updated.institute.code,
          name: updated.institute.name,
        },
      },
    });
  } catch (error) {
    console.error('PROFILE_UPDATE_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
