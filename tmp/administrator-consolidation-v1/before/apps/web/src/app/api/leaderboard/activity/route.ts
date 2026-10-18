import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET leaderboard/activity/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syllabusItemId = searchParams.get('syllabusItemId');
    if (!syllabusItemId) {
      return NextResponse.json({ message: 'syllabusItemId is required.' }, { status: 400 });
    }

    // Fetch the syllabus item to get maxPoints and rewards
    const item = await db.syllabusItem.findUnique({
      where: { id: syllabusItemId },
      select: {
        id: true,
        title: true,
        maxPoints: true,
        leaderboardEnabled: true,
        leaderboardRewards: {
          select: { placement: true, rewardLabel: true, bonusExp: true },
          orderBy: { placement: 'asc' },
        },
      },
    });

    if (!item || !item.leaderboardEnabled) {
      return NextResponse.json({ message: 'Leaderboard not enabled for this activity.' }, { status: 404 });
    }

    // Fetch all graded submissions ranked by score
    const submissions = await db.studentSubmission.findMany({
      where: {
        syllabusItemId,
        grade: { not: null },
        status: { in: ['GRADED', 'RETURNED'] },
      },
      select: {
        grade: true,
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            gamificationProfile: {
              select: {
                exp: true,
                level: true,
                levelTier: true,
                currentStreak: true,
                isLeaderboardAnonymized: true,
                badges: { select: { badgeRuleId: true } },
              },
            },
          },
        },
      },
      orderBy: { grade: 'desc' },
    });

    const rankings = submissions.map((sub, index) => {
      const isSelf = sub.student.id === session.user.id;
      const profile = sub.student.gamificationProfile;
      const isAnon = profile?.isLeaderboardAnonymized && !isSelf;
      return {
        rank: index + 1,
        studentId: sub.student.id,
        name: isAnon ? `Student #${sub.student.id.slice(-4).toUpperCase()}` : sub.student.name,
        avatarUrl: isAnon ? null : sub.student.avatarUrl,
        department: sub.student.department || '',
        score: sub.grade,
        maxPoints: item.maxPoints,
        exp: profile?.exp || 0,
        level: profile?.level || 1,
        levelTier: profile?.levelTier || 'newcomer',
        streak: profile?.currentStreak || 0,
        badgeCount: profile?.badges?.length || 0,
        isSelf,
        isAnonymized: profile?.isLeaderboardAnonymized || false,
      };
    });

    return NextResponse.json({
      item: { title: item.title, maxPoints: item.maxPoints },
      rewards: item.leaderboardRewards,
      rankings,
    });
  } catch (error) {
    console.error('ACTIVITY_LEADERBOARD_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
