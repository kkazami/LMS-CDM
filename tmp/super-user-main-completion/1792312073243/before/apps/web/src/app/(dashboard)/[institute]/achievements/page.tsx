import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import AchievementsClient from "./client";

export const dynamic = "force-dynamic";

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);

  // Fetch gamification profile for current user
  const profile = await db.gamificationProfile.findUnique({
    where: { studentId: session.user.id },
    select: {
      exp: true,
      level: true,
      levelTier: true,
      currentStreak: true,
      longestStreak: true,
      totalLoginDays: true,
      badges: {
        select: {
          badgeRuleId: true,
          earnedAt: true,
        },
      },
    },
  });

  const earnedBadges = (profile?.badges ?? []).map((b) => ({
    badgeRuleId: b.badgeRuleId,
    earnedAt: b.earnedAt.toISOString(),
  }));

  return (
    <Suspense fallback={null}>
      <AchievementsClient
        instituteCode={institute}
        theme={theme}
        exp={profile?.exp ?? 0}
        earnedBadges={earnedBadges}
        currentStreak={profile?.currentStreak ?? 0}
        totalLoginDays={profile?.totalLoginDays ?? 0}
      />
    </Suspense>
  );
}
