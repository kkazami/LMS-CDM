import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { GamificationDashboard } from "@/features/interactive-activities/gamification/components/GamificationDashboard";
import { LeaderboardUI } from "@/features/interactive-activities/gamification/components/LeaderboardUI";
import { WeeklyChallengeCard } from "@/features/interactive-activities/gamification/components/WeeklyChallengeCard";
import { leaderboardIdentity } from "@/lib/leaderboard-privacy";
import { z } from "zod";

const cachedRankings = z.array(z.object({ studentId: z.string(), points: z.number() }));

export default async function LeaderboardPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string }>;
}) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/activities/leaderboard/page.tsx", await params);

  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // Fetch gamification profile
  const profile = await db.gamificationProfile.findUnique({
    where: { studentId: session.user.id },
    include: {
      badges: true
    }
  });

  const earnedBadgeIds = profile ? profile.badges.map((b: any) => b.badgeRuleId) : [];

  // Fetch Leaderboard Cache
  const leaderboardCache = await db.activityLeaderboardCache.findUnique({
    where: {
      courseId_activityType: {
        courseId,
        activityType: "overall"
      }
    }
  });
  let scores: z.infer<typeof cachedRankings> = [];
  try {
    const cached = cachedRankings.safeParse(JSON.parse(leaderboardCache?.rankings || '[]'));
    if (cached.success) scores = cached.data;
  } catch { /* Malformed cached rankings can be rebuilt by the next activity. */ }
  const students = scores.length ? await db.user.findMany({
    where: { id: { in: scores.map(({ studentId }) => studentId) }, instituteId: session.user.instituteId, isActive: true },
    select: { id: true, name: true, gamificationProfile: { select: { isLeaderboardAnonymized: true } } },
  }) : [];
  const byId = new Map(students.map(student => [student.id, student]));
  const rankings = scores.flatMap(({ studentId, points }, index) => {
    const student = byId.get(studentId);
    if (!student) return [];
    const identity = leaderboardIdentity(student, student.gamificationProfile, index + 1, session.user.id);
    return [{ studentId: identity.studentId, displayName: identity.name, points }];
  });

  // Fetch Weekly Challenge (Active)
  const challenge = await db.weeklyChallenge.findFirst({
    where: {
      courseId,
      endDate: {
        gte: new Date()
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Stats</h1>
        <p className="text-gray-500 mt-1">Your progress, badges, and class rankings.</p>
      </div>

      {challenge && (
        <WeeklyChallengeCard challenge={challenge as any} instituteCode={institute} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <GamificationDashboard profile={profile} earnedBadgeIds={earnedBadgeIds} />
        </div>
        
        <div className="lg:col-span-1">
          <LeaderboardUI 
            rankings={rankings}
            currentStudentId={session.user.id} 
          />
        </div>
      </div>
    </div>
  );
}
