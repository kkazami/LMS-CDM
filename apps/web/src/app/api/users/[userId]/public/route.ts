import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { leaderboardVisibility } from "@/lib/leaderboard-privacy";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ userId: string }> };

const miniCardStats = {
  exp: true,
  level: true,
  levelTier: true,
  currentStreak: true,
  longestStreak: true,
  totalLoginDays: true,
  badges: {
    select: { badgeRuleId: true, earnedAt: true },
    orderBy: { earnedAt: 'desc' as const },
    take: 6,
  },
} as const;

export async function GET(_req: Request, { params }: RouteParams) {
  const ceilingDenial = await denyLegacyApi(_req, "GET users/[userId]/public/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  if (new URL(_req.url).searchParams.get('source') === 'leaderboard') {
    const entry = await db.user.findFirst({
      where: { id: userId, instituteId: session.user.instituteId, role: 'STUDENT', isActive: true },
      select: {
        id: true, name: true, role: true, avatarUrl: true, department: true, coverColor: true, preferences: true,
        gamificationProfile: { select: { ...miniCardStats, isLeaderboardAnonymized: true } },
      },
    });
    const visibility = leaderboardVisibility(entry?.gamificationProfile, entry?.preferences);
    const headers = { 'Cache-Control': 'private, no-store' };
    if (!entry || visibility === 'anonymous') {
      return NextResponse.json({ message: 'User not found.' }, { status: 404, headers });
    }
    const { gamificationProfile, preferences: _preferences, ...identity } = entry;
    const stats = gamificationProfile ? {
      exp: gamificationProfile.exp,
      currentStreak: gamificationProfile.currentStreak,
      badges: gamificationProfile.badges,
    } : null;
    return NextResponse.json({ user: {
      ...identity,
      avatarUrl: visibility === 'photo' ? identity.avatarUrl : null,
      canViewFullProfile: visibility === 'photo',
      gamificationProfile: stats,
    } }, { headers });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentNumber: true,
      uniqueId: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      department: true,
      yearLevel: true,
      coverColor: true,
      createdAt: true,
      instituteId: true,
      institute: { select: { code: true, name: true } },
      taughtCourses: {
        where: { isArchived: false },
        select: { id: true, title: true, code: true },
        take: 5,
      },
      enrollments: {
        where: { status: "APPROVED" },
        select: { course: { select: { id: true, title: true, code: true } } },
        take: 5,
      },
      gamificationProfile: {
        select: miniCardStats,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  // Security: only users in the same institute can view profiles
  const sessionUser = session.user as Record<string, unknown>;
  const sessionInstituteId = sessionUser.instituteId as string;

  if (user.instituteId !== sessionInstituteId) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ user });
}
