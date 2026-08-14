import { NextResponse } from "next/server";
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

/**
 * GET /api/flashcards/study?deckId=...
 *
 * Returns cards prioritized for study:
 *   1. "incorrect" cards first (needs review)
 *   2. "unseen" cards next (new material)
 *   3. "correct" cards last (already mastered)
 */
export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const url = new URL(request.url);
  const deckId = url.searchParams.get("deckId");

  if (!deckId) {
    return NextResponse.json({ message: "Missing deckId." }, { status: 400 });
  }

  // Verify deck ownership
  const deck = await db.flashcardDeck.findFirst({
    where: {
      id: deckId,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!deck) {
    return NextResponse.json({ message: "Deck not found." }, { status: 404 });
  }

  const cards = await db.flashcard.findMany({
    where: { deckId },
    include: {
      progress: {
        where: { userId: session.user.id },
        select: {
          status: true,
          attemptCount: true,
          correctCount: true,
          lastAnswer: true,
          lastReviewedAt: true,
        },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  // Map and serialize
  const serialized = cards.map((card) => {
    const prog = card.progress[0] ?? null;
    return {
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      hint: card.hint,
      attachments: JSON.parse(card.attachments),
      orderIndex: card.orderIndex,
      progress: prog
        ? {
            status: prog.status,
            attemptCount: prog.attemptCount,
            correctCount: prog.correctCount,
            lastAnswer: prog.lastAnswer,
            lastReviewedAt: prog.lastReviewedAt?.toISOString() ?? null,
          }
        : undefined,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  });

  // Prioritize: incorrect → unseen → correct, then shuffle within each group
  const incorrect = serialized.filter((c) => (c.progress?.status ?? "unseen") === "incorrect");
  const unseen = serialized.filter((c) => !c.progress || c.progress.status === "unseen");
  const correct = serialized.filter((c) => (c.progress?.status ?? "unseen") === "correct");

  // Fisher-Yates shuffle
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const sorted = [...shuffle(incorrect), ...shuffle(unseen), ...shuffle(correct)];

  // Compute study stats
  const stats = {
    totalCards: sorted.length,
    correct: correct.length,
    incorrect: incorrect.length,
    unseen: unseen.length,
  };

  return NextResponse.json({ cards: sorted, stats });
}
