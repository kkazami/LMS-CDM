import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { GamificationDashboard } from "@/features/interactive-activities/gamification/components/GamificationDashboard";
import { LeaderboardUI } from "@/features/interactive-activities/gamification/components/LeaderboardUI";
import { WeeklyChallengeCard } from "@/features/interactive-activities/gamification/components/WeeklyChallengeCard";
import { getInstituteTheme } from "@/lib/get-institute-theme";

export default async function LeaderboardPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string }>;
}) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${institute}/login`);
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
        <h1 className="text-2xl font-bold text-gray-900">Gamification Dashboard</h1>
        <p className="text-gray-500 mt-1">Track your progress, earn badges, and compete with your classmates.</p>
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
            rankingsJson={leaderboardCache ? leaderboardCache.rankings : "[]"} 
            currentStudentId={session.user.id} 
          />
        </div>
      </div>
    </div>
  );
}
