import { NextResponse, after } from "next/server";
import { denyLegacyApi } from "@/lib/super-user-v1/legacy-entry-guard";
import { z } from "zod";
import { requireWorkspaceSession } from "../../workspace/_shared";
import { db } from "@/lib/db";
import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";
import { logActivity } from "@/lib/ite/activity-logger";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  deckId: z.string().min(1),
  cardsReviewed: z.number().int().min(1),
  durationSeconds: z.number().min(5),
});

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST flashcards/complete-session/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const { session, response } = await requireWorkspaceSession();
    if (response) return response;

    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed" }, { status: 400 });
    }

    const { deckId, cardsReviewed, durationSeconds } = parsed.data;
    const userId = session.user.id;
    const instituteId = (session.user as Record<string, unknown>).instituteId as string | undefined;

    const deck = await db.flashcardDeck.findUnique({
      where: { id: deckId },
      select: { id: true, title: true, courseId: true },
    });

    if (!deck) {
      return NextResponse.json({ message: "Deck not found" }, { status: 404 });
    }

    let grantedExp = 0;
    let leveledUp = false;
    let newLevel = 1;

    if (cardsReviewed >= 3 && durationSeconds >= 10) {
      const expRes = await grantExp({
        userId,
        amount: EXP_VALUES.flashcard_session,
        reason: `Flashcard Deck Review: ${deck.title}`,
        source: "flashcard",
        courseId: deck.courseId ?? undefined,
        dailyCap: DAILY_EXP_CAPS.flashcard,
      });

      grantedExp = expRes.grantedAmount;
      leveledUp = expRes.leveledUp;
      newLevel = expRes.newLevel;

      await awardBadgeIfEarned(userId, "flashcard-first").catch(() => {});
    }

    after(async () => {
      try {
        await logActivity({
          userId,
          instituteId,
          courseId: deck.courseId ?? undefined,
          type: "FLASHCARD_REVIEW",
          refId: deck.id,
        });
      } catch (err) {
        console.error("[activity-logger] flashcard review error:", err);
      }
    });

    return NextResponse.json(
      {
        success: true,
        grantedExp,
        leveledUp,
        newLevel,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("FLASHCARD_COMPLETE_SESSION_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
