import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import LeaderboardsClient from "./client";
import { leaderboardCourseWhere, leaderboardActivityWhere } from "@/lib/activity-leaderboard";

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ institute: string }>;
  searchParams: Promise<{ courseId?: string; syllabusItemId?: string }>;
}) {
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/leaderboards/page.tsx", await params);

  const { institute } = await params;

  const theme = getInstituteTheme(institute);

  // Load institute rankings and authorized course boards together.
  const [globalProfiles, courses, leaderboardActivities] = await Promise.all([
    db.gamificationProfile.findMany({
      where: {
        student: {
          institute: { code: institute.toLowerCase() },
          role: "STUDENT",
          isActive: true,
        },
      },
      select: {
        id: true,
        studentId: true,
        exp: true,
        level: true,
        levelTier: true,
        currentStreak: true,
        loginStreakCurrent: true,
        isLeaderboardAnonymized: true,
        student: {
          select: {
            id: true,
            name: true,
            studentNumber: true,
            avatarUrl: true,
            department: true,
          },
        },
        badges: {
          select: { badgeRuleId: true },
        },
      },
      // studentId breaks EXP ties deterministically (same order as the dashboard rank).
      orderBy: [{ exp: "desc" }, { studentId: "asc" }],
      take: 50,
    }),
    db.course.findMany({
      where: leaderboardCourseWhere(user),
      select: {
        id: true,
        title: true,
        code: true,
      },
      orderBy: { code: "asc" },
    }),
    db.syllabusItem.findMany({
      where: {
        ...leaderboardActivityWhere(user),
        leaderboardEnabled: true,
      },
      select: {
        id: true,
        title: true,
        type: true,
        maxPoints: true,
        courseId: true,
        course: { select: { code: true, title: true } },
        leaderboardRewards: {
          select: { placement: true, rewardLabel: true, bonusExp: true },
          orderBy: { placement: 'asc' as const },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Serialize and sanitize for client
  const serializedRankings = globalProfiles.map((p, index) => {
    const isSelf = p.studentId === user.id;
    const isAnon = p.isLeaderboardAnonymized && !isSelf;
    const displayName = isAnon
      ? `Student #${p.student.id.slice(-4).toUpperCase()}`
      : p.student.name;

    return {
      rank: index + 1,
      studentId: p.studentId,
      name: displayName,
      avatarUrl: isAnon ? null : p.student.avatarUrl,
      department: p.student.department || institute.toUpperCase(),
      exp: p.exp,
      level: p.level,
      levelTier: p.levelTier,
      streak: p.loginStreakCurrent,
      badgeCount: p.badges.length,
      isSelf,
      isAnonymized: p.isLeaderboardAnonymized,
    };
  });

  // Check self anonymity status (default to false: real names shown by default)
  const selfProfile = globalProfiles.find((p) => p.studentId === user.id);
  const selfAnonymized = selfProfile?.isLeaderboardAnonymized ?? false;
  const query = await searchParams;
  const initialActivity = leaderboardActivities.find(a => a.id === query.syllabusItemId);
  const initialCourseId = initialActivity?.courseId ?? courses.find(c => c.id === query.courseId)?.id;

  return (
    <LeaderboardsClient
      rankings={serializedRankings}
      enrolledCourses={courses}
      initialCourseId={initialCourseId}
      initialActivityId={initialActivity?.id}
      leaderboardActivities={leaderboardActivities}
      currentUserId={user.id}
      instituteCode={institute}
      theme={theme}
      initialSelfAnonymized={selfAnonymized}
    />
  );
}
