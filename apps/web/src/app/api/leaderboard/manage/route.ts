import { assertOrdinaryClasswork } from '@/lib/academic-task';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { z } from "zod";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";
import { leaderboardCourseWhere } from "@/lib/activity-leaderboard";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  syllabusItemId: z.string().min(1),
  leaderboardEnabled: z.boolean().optional(),
  rewardTiers: z.array(z.object({
    placement: z.number().int().positive().max(2147483647),
    rewardLabel: z.string().trim().max(500),
    bonusExp: z.number().int().nonnegative().max(2147483647),
  })).max(100).refine(tiers => new Set(tiers.map(t => t.placement)).size === tiers.length, "Use each placement only once.").optional(),
}).refine(data => data.leaderboardEnabled !== undefined || data.rewardTiers !== undefined);

export async function PATCH(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH leaderboard/manage/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Provide an activity and valid leaderboard settings. Use each reward placement only once." }, { status: 400 });
    }
    const { syllabusItemId, leaderboardEnabled, rewardTiers } = parsed.data;

    const item = await db.syllabusItem.findFirst({
      where: { id: syllabusItemId, type: { not: "MATERIAL" }, course: leaderboardCourseWhere(session.user) },
      select: { id: true },
    });

    if (!item) {
      return NextResponse.json({ message: "Activity not found." }, { status: 404 });
    }

    // A nested update saves publication and rewards atomically.
    const updated = await db.$transaction(async tx => {
      await assertOrdinaryClasswork(tx, syllabusItemId);
      return tx.syllabusItem.update({
      where: { id: syllabusItemId },
      data: {
        ...(typeof leaderboardEnabled === "boolean" ? { leaderboardEnabled } : {}),
        ...(rewardTiers !== undefined ? {
          leaderboardRewards: { deleteMany: {}, create: rewardTiers },
        } : {}),
      },
      include: {
        leaderboardRewards: { orderBy: { placement: "asc" } },
      },
    });

    });

    return NextResponse.json({
      id: updated.id,
      leaderboardEnabled: updated.leaderboardEnabled,
      rewards: updated.leaderboardRewards,
    });
  } catch (error) {
    console.error("MANAGE_LEADERBOARD_API_ERROR", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
