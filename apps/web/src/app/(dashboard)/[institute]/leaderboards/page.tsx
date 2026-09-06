import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import LeaderboardsClient from "./client";

export const dynamic = "force-dynamic";

export default async function LeaderboardsPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);

  // 1. Fetch Global Institute Leaderboard (Top 50)
  const globalProfiles = await db.gamificationProfile.findMany({
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
    orderBy: { exp: "desc" },
    take: 50,
  });

  // 2. Fetch User's Enrolled Courses for cohort tab
  const userEnrollments = await db.enrollment.findMany({
    where: { studentId: session.user.id, status: "APPROVED" },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
        },
      },
    },
  });

  // 3. Serialize and sanitize for client
  const serializedRankings = globalProfiles.map((p, index) => {
    const isSelf = p.studentId === session.user.id;
    const isAnon = p.isLeaderboardAnonymized && !isSelf;
    const displayName = isAnon
      ? `Student #${p.student.id.slice(-4).toUpperCase()}`
      : p.student.name;

    return {
      rank: index + 1,
      studentId: p.studentId,
      name: displayName,
      avatarUrl: isAnon ? null : p.student.avatarUrl,
      department: p.student.department || "ICS",
      exp: p.exp,
      level: p.level,
      levelTier: p.levelTier,
      streak: p.currentStreak,
      badgeCount: p.badges.length,
      isSelf,
      isAnonymized: p.isLeaderboardAnonymized,
    };
  });

  // Check self anonymity status (default to false: real names shown by default)
  const selfProfile = globalProfiles.find((p) => p.studentId === session.user.id);
  const selfAnonymized = selfProfile?.isLeaderboardAnonymized ?? false;

  return (
    <LeaderboardsClient
      rankings={serializedRankings}
      enrolledCourses={userEnrollments.map((e) => e.course)}
      currentUserId={session.user.id}
      instituteCode={institute}
      theme={theme}
      initialSelfAnonymized={selfAnonymized}
    />
  );
}
