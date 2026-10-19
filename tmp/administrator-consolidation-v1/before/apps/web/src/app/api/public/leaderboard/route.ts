import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface PublicLeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  avatar: string | null;
  points: number;
  exp: number;
  tier: string;
  program: string;
}

export async function GET() {
  try {
    const profiles = await db.gamificationProfile.findMany({
      where: {
        OR: [
          { exp: { gt: 0 } },
          { totalPoints: { gt: 0 } },
        ],
        student: {
          role: "STUDENT",
          isActive: true,
        },
      },
      select: {
        id: true,
        exp: true,
        totalPoints: true,
        levelTier: true,
        isLeaderboardAnonymized: true,
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            institute: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: [
        { exp: "desc" },
        { totalPoints: "desc" },
      ],
      take: 10,
    });

    const entries: PublicLeaderboardEntry[] = profiles.map((p, idx) => {
      const isAnon = p.isLeaderboardAnonymized;
      const points = p.exp > 0 ? p.exp : p.totalPoints;
      const rawTier = p.levelTier || "newcomer";
      const tier = rawTier.charAt(0).toUpperCase() + rawTier.slice(1);
      const program =
        p.student.department?.trim() ||
        p.student.institute?.name ||
        "General";

      return {
        id: p.student.id,
        rank: idx + 1,
        displayName: isAnon
          ? `Student #${p.student.id.slice(-4).toUpperCase()}`
          : p.student.name,
        avatar: isAnon ? null : p.student.avatarUrl,
        points,
        exp: points,
        tier,
        program,
      };
    });

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error("[LEADERBOARD_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
