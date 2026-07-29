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

    if (!instituteCode) {
      return NextResponse.json({ message: 'Institute code is required.' }, { status: 400 });
    }

    const institute = await db.institute.findUnique({ where: { code: instituteCode } });
    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    // Get leaderboard from gamification profiles
    const profiles = await db.gamificationProfile.findMany({
      where: {
        student: { instituteId: institute.id },
      },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { totalPoints: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      entries: profiles.map((p, index) => ({
        rank: index + 1,
        userId: p.student.id,
        userName: p.student.name,
        totalPoints: p.totalPoints,
        currentStreak: p.currentStreak,
      })),
    });
  } catch (error) {
    console.error('LEADERBOARD_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
