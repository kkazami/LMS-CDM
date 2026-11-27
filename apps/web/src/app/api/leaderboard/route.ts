import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { leaderboardIdentity, leaderboardVisibility } from '@/lib/leaderboard-privacy';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET leaderboard/route.ts");
  if (ceilingDenial) return ceilingDenial;

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

    if (institute.id !== session.user.instituteId) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });

    const [profiles, selfPrivacy] = await Promise.all([db.gamificationProfile.findMany({
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
        student: { select: { id: true, name: true, avatarUrl: true, preferences: true } },
      },
      orderBy: { exp: 'desc' },
      take: limit,
    }), db.gamificationProfile.findUnique({
      where: { studentId: session.user.id },
      select: { isLeaderboardAnonymized: true, student: { select: { preferences: true } } },
    })]);

    const entries = profiles.map((p, index) => {
      const identity = leaderboardIdentity(p.student, p, index + 1, session.user.id);

      return {
        rank: index + 1,
        userId: identity.studentId,
        userName: identity.name,
        totalPoints: p.exp || p.totalPoints || 0,
        currentStreak: p.currentStreak || p.loginStreakCurrent || 0,
        level: p.level,
        levelTier: p.levelTier,
        avatarUrl: identity.avatarUrl,
        isCurrentUser: identity.isSelf,
      };
    });

    return NextResponse.json(
      { entries, visibility: leaderboardVisibility(selfPrivacy, selfPrivacy?.student.preferences) },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    console.error('LEADERBOARD_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
