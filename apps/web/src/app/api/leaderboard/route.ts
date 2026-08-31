import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);

    if (!instituteCode) {
      return NextResponse.json({ message: 'Institute code is required.' }, { status: 400 });
    }

    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
      select: { id: true },
    });
    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const profiles = await db.gamificationProfile.findMany({
      where: {
        student: { instituteId: institute.id },
      },
      select: {
        totalPoints: true,
        loginStreakCurrent: true,
        student: { select: { id: true, name: true } },
      },
      orderBy: { totalPoints: 'desc' },
      take: limit,
    });

    return NextResponse.json(
      {
        entries: profiles.map((p, index) => ({
          rank: index + 1,
          userId: p.student.id,
          userName: p.student.name,
          totalPoints: p.totalPoints,
          currentStreak: p.loginStreakCurrent || 0,
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('LEADERBOARD_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
