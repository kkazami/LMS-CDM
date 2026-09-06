import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../../workspace/_shared";
import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";

export const dynamic = "force-dynamic";

const completeSchema = z.object({
  materialId: z.string().min(1),
  durationSeconds: z.number().min(10),
});

export async function POST(request: Request) {
  try {
    const { session, response } = await requireWorkspaceSession();
    if (response) return response;

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed" }, { status: 400 });
    }

    const { materialId, durationSeconds } = parsed.data;

    // Verify material exists
    const material = await db.syllabusItem.findUnique({
      where: { id: materialId },
      select: { id: true, title: true, courseId: true },
    });

    if (!material) {
      return NextResponse.json({ message: "Learning material not found" }, { status: 404 });
    }

    // Minimum engagement threshold (≥15 seconds of reading)
    let grantedExp = 0;
    let leveledUp = false;
    let newLevel = 1;

    if (durationSeconds >= 15) {
      const expRes = await grantExp({
        userId: session.user.id,
        amount: EXP_VALUES.material_read,
        reason: `Reviewed Material: ${material.title}`,
        source: "material",
        courseId: material.courseId,
        idempotencyKey: `material_${materialId}`,
        dailyCap: DAILY_EXP_CAPS.material,
      });

      grantedExp = expRes.grantedAmount;
      leveledUp = expRes.leveledUp;
      newLevel = expRes.newLevel;

      await awardBadgeIfEarned(session.user.id, "material-first");
    }

    return NextResponse.json({
      success: true,
      grantedExp,
      leveledUp,
      newLevel,
    });
  } catch (error) {
    console.error("MATERIAL_COMPLETE_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
