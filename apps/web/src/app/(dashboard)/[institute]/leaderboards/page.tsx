import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import LeaderboardsClient from "./client";
import { leaderboardCourseWhere, leaderboardActivityWhere } from "@/lib/activity-leaderboard";
import { leaderboardIdentity, leaderboardVisibility } from "@/lib/leaderboard-privacy";

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
  const isStudent = user.role === 'STUDENT';
  const [globalProfiles, courses, leaderboardActivities, selfPrivacy] = await Promise.all([
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
        loginStreakCurrent: true,
        isLeaderboardAnonymized: true,
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            preferences: true,
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
    isStudent ? db.gamificationProfile.findUnique({
      where: { studentId: user.id },
      select: { isLeaderboardAnonymized: true, student: { select: { preferences: true } } },
    }) : null,
  ]);

  // Serialize and sanitize for client
  const serializedRankings = globalProfiles.map((p, index) => ({
    rank: index + 1,
    ...leaderboardIdentity(p.student, p, index + 1, user.id),
    exp: p.exp,
    level: p.level,
    levelTier: p.levelTier,
    streak: p.loginStreakCurrent,
    badgeCount: p.badges.length,
  }));

  const query = await searchParams;
  const initialActivity = leaderboardActivities.find(a => a.id === query.syllabusItemId);
  const initialCourseId = initialActivity?.courseId ?? courses.find(c => c.id === query.courseId)?.id;

  return (
    <LeaderboardsClient
      key={initialActivity?.id ?? initialCourseId ?? "exp"}
      rankings={serializedRankings}
      enrolledCourses={courses}
      initialCourseId={initialCourseId}
      initialActivityId={initialActivity?.id}
      leaderboardActivities={leaderboardActivities}
      instituteCode={institute}
      theme={theme}
      initialVisibility={isStudent ? leaderboardVisibility(selfPrivacy, selfPrivacy?.student.preferences) : null}
    />
  );
}
