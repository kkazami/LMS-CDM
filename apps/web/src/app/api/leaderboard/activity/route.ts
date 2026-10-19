import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { leaderboardActivityWhere, leaderboardScore, rankedSubmissionWhere } from '@/lib/activity-leaderboard';

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
    const item = await db.syllabusItem.findFirst({
      where: { ...leaderboardActivityWhere(session.user), id: syllabusItemId },
      select: {
        id: true,
        title: true,
        maxPoints: true,
        courseId: true,
        course: { select: { code: true, title: true } },
        form: { select: { id: true } },
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
        ...rankedSubmissionWhere,
        student: {
          instituteId: session.user.instituteId,
          role: 'STUDENT',
          isActive: true,
          enrollments: { some: { courseId: item.courseId, status: 'APPROVED' } },
        },
      },
      select: {
        grade: true,
        status: true,
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

    const scores = submissions.map(sub => ({
      ...sub,
      score: leaderboardScore(sub.grade!, sub.status, Boolean(item.form), item.maxPoints),
    })).sort((a, b) => b.score - a.score || a.student.id.localeCompare(b.student.id));
    let rank = 0;
    const rankings = scores.map((sub, index) => {
      if (index === 0 || sub.score !== scores[index - 1].score) rank = index + 1;
      const isSelf = sub.student.id === session.user.id;
      const profile = sub.student.gamificationProfile;
      const isAnon = profile?.isLeaderboardAnonymized && !isSelf;
      return {
        rank,
        studentId: sub.student.id,
        name: isAnon ? `Student #${sub.student.id.slice(-4).toUpperCase()}` : sub.student.name,
        avatarUrl: isAnon ? null : sub.student.avatarUrl,
        department: sub.student.department || '',
        score: sub.score,
        maxPoints: item.maxPoints ?? (item.form ? 100 : null),
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
      item: { title: item.title, maxPoints: item.maxPoints ?? (item.form ? 100 : null), courseId: item.courseId, course: item.course },
      rewards: item.leaderboardRewards,
      rankings,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('ACTIVITY_LEADERBOARD_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
