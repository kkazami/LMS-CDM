import { studentMutationReceipt } from '@/lib/student-mutation-receipt';
import { accountErrorResponse } from '@/lib/super-user-v1/actor';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../../workspace/_shared";

export const dynamic = "force-dynamic";

function requireStudentRole(role: string): NextResponse | null {
  if (role.toUpperCase() !== "STUDENT") {
    return NextResponse.json(
      { message: "Flashcards are only available to students." },
      { status: 403 }
    );
  }
  return null;
}

const progressSchema = z.object({
  cardId: z.string().min(1),
  selfRating: z.enum(["knew_it", "still_learning"]),
});

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST flashcards/progress/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch the card and verify it belongs to the user's deck
  const card = await db.flashcard.findFirst({
    where: {
      id: parsed.data.cardId,
      deck: {
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
      },
    },
    select: { id: true, back: true },
  });

  if (!card) {
    return NextResponse.json({ message: "Card not found." }, { status: 404 });
  }

  const isCorrect = parsed.data.selfRating === "knew_it";

  try {
    const result = await studentMutationReceipt(session.user.id, 'flashcard-review', request.headers.get('idempotency-key'), parsed.data, async tx => {
      await tx.flashcardProgress.upsert({
        where: { cardId_userId: { cardId: card.id, userId: session.user.id } },
        create: { cardId: card.id, userId: session.user.id, status: isCorrect ? 'correct' : 'incorrect', attemptCount: 1, correctCount: isCorrect ? 1 : 0, lastAnswer: parsed.data.selfRating, lastReviewedAt: new Date() },
        update: { status: isCorrect ? 'correct' : 'incorrect', attemptCount: { increment: 1 }, correctCount: { increment: isCorrect ? 1 : 0 }, lastAnswer: parsed.data.selfRating, lastReviewedAt: new Date() },
      });
      return { correct: isCorrect, correctAnswer: card.back };
    });
    return NextResponse.json(result);
  } catch (error) { return accountErrorResponse(error); }
}
