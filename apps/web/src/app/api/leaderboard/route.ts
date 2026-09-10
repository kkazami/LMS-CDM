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

    const institute = await db.institute.findFirst({
      where: {
        OR: [
          { code: instituteCode },
          { code: instituteCode.toLowerCase() },
          { code: instituteCode.toUpperCase() },
        ],
      },
      select: { id: true },
    });
    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const profiles = await db.gamificationProfile.findMany({
      where: {
        student: { instituteId: institute.id, role: 'STUDENT', isActive: true },
      },
      select: {
        id: true,
        studentId: true,
        totalPoints: true,
        exp: true,
        level: true,
        levelTier: true,
        loginStreakCurrent: true,
        currentStreak: true,
        isLeaderboardAnonymized: true,
        student: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { exp: 'desc' },
      take: limit,
    });

    const entries = profiles.map((p, index) => {
      const isCurrentUser = session.user.id === p.student.id;
      const isAnon = p.isLeaderboardAnonymized && !isCurrentUser;
      const userName = isAnon
        ? `Student #${p.student.id.slice(-4).toUpperCase()}`
        : p.student.name;

      return {
        rank: index + 1,
        userId: p.student.id,
        userName,
        totalPoints: p.exp || p.totalPoints || 0,
        currentStreak: p.currentStreak || p.loginStreakCurrent || 0,
        level: p.level,
        levelTier: p.levelTier,
        avatarUrl: isAnon ? null : p.student.avatarUrl,
        isCurrentUser,
      };
    });

    return NextResponse.json(
      { entries },
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
