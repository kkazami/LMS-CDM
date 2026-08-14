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

const answerSchema = z.object({
  cardId: z.string().min(1),
  answer: z.string(),
});

export async function POST(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const body = await request.json();
  const parsed = answerSchema.safeParse(body);

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

  // Case-insensitive trimmed comparison
  const studentAnswer = parsed.data.answer.trim().toLowerCase();
  const correctAnswer = card.back.trim().toLowerCase();
  const isCorrect = studentAnswer === correctAnswer;

  // Upsert progress
  const existing = await db.flashcardProgress.findUnique({
    where: {
      cardId_userId: {
        cardId: card.id,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    await db.flashcardProgress.update({
      where: { id: existing.id },
      data: {
        status: isCorrect ? "correct" : "incorrect",
        attemptCount: existing.attemptCount + 1,
        correctCount: isCorrect ? existing.correctCount + 1 : existing.correctCount,
        lastAnswer: parsed.data.answer.trim(),
        lastReviewedAt: new Date(),
      },
    });
  } else {
    await db.flashcardProgress.create({
      data: {
        cardId: card.id,
        userId: session.user.id,
        status: isCorrect ? "correct" : "incorrect",
        attemptCount: 1,
        correctCount: isCorrect ? 1 : 0,
        lastAnswer: parsed.data.answer.trim(),
        lastReviewedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    correct: isCorrect,
    correctAnswer: card.back,
  });
}
