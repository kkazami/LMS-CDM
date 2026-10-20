import { NextResponse, after } from "next/server";
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { z } from "zod";
import { requireWorkspaceSession } from "../../workspace/_shared";
import { processCompleteSession } from "@/lib/ite/offline/flashcard-complete";
import { logActivity } from "@/lib/ite/activity-logger";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  deckId: z.string().min(1),
  cardsReviewed: z.number().int().min(1),
  durationSeconds: z.number().min(5),
  idempotencyKey: z.string().optional(),
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

    const { deckId, cardsReviewed, durationSeconds, idempotencyKey } = parsed.data;

    const result = await processCompleteSession({
      userId: session.user.id,
      instituteId: (session.user as Record<string, unknown>).instituteId as string | undefined,
      deckId,
      cardsReviewed,
      durationSeconds,
      idempotencyKey,
    });

    if (result.shouldLogActivity && result.activityParams) {
      after(async () => {
        try {
          await logActivity(result.activityParams!);
        } catch (err) {
          console.error("[activity-logger] flashcard review error:", err);
        }
      });
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("FLASHCARD_COMPLETE_SESSION_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
