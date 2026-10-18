import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const { syllabusItemId, leaderboardEnabled, rewardTiers } = body as {
      syllabusItemId: string;
      leaderboardEnabled?: boolean;
      rewardTiers?: { placement: number; rewardLabel: string; bonusExp: number }[];
    };

    if (!syllabusItemId) {
      return NextResponse.json({ message: "syllabusItemId is required." }, { status: 400 });
    }

    const item = await db.syllabusItem.findUnique({
      where: { id: syllabusItemId },
      include: {
        course: { select: { id: true, instructorId: true, code: true, title: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ message: "Activity not found." }, { status: 404 });
    }

    if (role !== "ADMIN" && item.course.instructorId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized for this course." }, { status: 403 });
    }

    // Update leaderboardEnabled if provided
    const updated = await db.syllabusItem.update({
      where: { id: syllabusItemId },
      data: {
        ...(typeof leaderboardEnabled === "boolean" ? { leaderboardEnabled } : {}),
      },
      include: {
        leaderboardRewards: { orderBy: { placement: "asc" } },
      },
    });

    // Update reward tiers if array is provided
    if (Array.isArray(rewardTiers)) {
      await db.leaderboardReward.deleteMany({ where: { syllabusItemId } });
      if (rewardTiers.length > 0) {
        await db.leaderboardReward.createMany({
          data: rewardTiers.map((t) => ({
            syllabusItemId,
            placement: Math.max(1, Number(t.placement) || 1),
            rewardLabel: t.rewardLabel?.trim() || "",
            bonusExp: Math.max(0, Number(t.bonusExp) || 0),
          })),
        });
      }
    }

    const refreshedRewards = await db.leaderboardReward.findMany({
      where: { syllabusItemId },
      orderBy: { placement: "asc" },
    });

    return NextResponse.json({
      id: updated.id,
      leaderboardEnabled: updated.leaderboardEnabled,
      rewards: refreshedRewards,
    });
  } catch (error) {
    console.error("MANAGE_LEADERBOARD_API_ERROR", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
