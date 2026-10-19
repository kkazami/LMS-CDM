import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../../workspace/_shared";
import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  deckId: z.string().min(1),
  cardsReviewed: z.number().int().min(1),
  durationSeconds: z.number().min(5),
});

export async function POST(request: Request) {
  try {
    const { session, response } = await requireWorkspaceSession();
    if (response) return response;

    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Validation failed" }, { status: 400 });
    }

    const { deckId, cardsReviewed, durationSeconds } = parsed.data;

    // Verify deck exists
    const deck = await db.flashcardDeck.findUnique({
      where: { id: deckId },
      select: { id: true, title: true, courseId: true },
    });

    if (!deck) {
      return NextResponse.json({ message: "Deck not found" }, { status: 404 });
    }

    // Minimum engagement threshold (≥3 cards and ≥10 seconds duration)
    let grantedExp = 0;
    let leveledUp = false;
    let newLevel = 1;

    if (cardsReviewed >= 3 && durationSeconds >= 10) {
      const expRes = await grantExp({
        userId: session.user.id,
        amount: EXP_VALUES.flashcard_session,
        reason: `Flashcard Deck Review: ${deck.title}`,
        source: "flashcard",
        courseId: deck.courseId ?? undefined,
        dailyCap: DAILY_EXP_CAPS.flashcard,
      });

      grantedExp = expRes.grantedAmount;
      leveledUp = expRes.leveledUp;
      newLevel = expRes.newLevel;

      await awardBadgeIfEarned(session.user.id, "flashcard-first");
    }

    return NextResponse.json({
      success: true,
      grantedExp,
      leveledUp,
      newLevel,
    });
  } catch (error) {
    console.error("FLASHCARD_COMPLETE_SESSION_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
