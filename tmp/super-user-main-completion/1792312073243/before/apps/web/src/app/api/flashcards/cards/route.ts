import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../../workspace/_shared";

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

const attachmentSchema = z.object({
  type: z.enum(["image", "code"]),
  url: z.string(),
  label: z.string().default(""),
});

const cardSchema = z.object({
  deckId: z.string().min(1),
  front: z.string().min(1, "Front (question) is required"),
  back: z.string().min(1, "Back (answer key) is required"),
  hint: z.string().default(""),
  attachments: z.array(attachmentSchema).default([]),
  orderIndex: z.number().int().default(0),
});

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

  const result = cards.map((card) => {
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

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const body = await request.json();
  const parsed = cardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify deck ownership
  const deck = await db.flashcardDeck.findFirst({
    where: {
      id: parsed.data.deckId,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!deck) {
    return NextResponse.json({ message: "Deck not found." }, { status: 404 });
  }

  const card = await db.flashcard.create({
    data: {
      deckId: parsed.data.deckId,
      front: parsed.data.front,
      back: parsed.data.back,
      hint: parsed.data.hint,
      attachments: JSON.stringify(parsed.data.attachments),
      orderIndex: parsed.data.orderIndex,
    },
  });

  return NextResponse.json(
    {
      ...card,
      attachments: parsed.data.attachments,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const body = await request.json();
  const updateSchema = cardSchema.partial().extend({ id: z.string().min(1) });
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify card belongs to user's deck
  const card = await db.flashcard.findFirst({
    where: {
      id: parsed.data.id,
      deck: {
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
      },
    },
  });

  if (!card) {
    return NextResponse.json({ message: "Card not found." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.front !== undefined) updateData.front = parsed.data.front;
  if (parsed.data.back !== undefined) updateData.back = parsed.data.back;
  if (parsed.data.hint !== undefined) updateData.hint = parsed.data.hint;
  if (parsed.data.attachments !== undefined) updateData.attachments = JSON.stringify(parsed.data.attachments);
  if (parsed.data.orderIndex !== undefined) updateData.orderIndex = parsed.data.orderIndex;

  const updated = await db.flashcard.update({
    where: { id: card.id },
    data: updateData,
  });

  return NextResponse.json({
    ...updated,
    attachments: JSON.parse(updated.attachments),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const url = new URL(request.url);
  const singleId = url.searchParams.get("id");
  const batchIds = url.searchParams.get("ids");

  const idsToDelete: string[] = [];

  if (batchIds) {
    idsToDelete.push(...batchIds.split(",").filter(Boolean));
  } else if (singleId) {
    idsToDelete.push(singleId);
  } else {
    return NextResponse.json({ message: "Missing card id(s)." }, { status: 400 });
  }

  // Verify all cards belong to user's decks
  const cards = await db.flashcard.findMany({
    where: {
      id: { in: idsToDelete },
      deck: {
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
      },
    },
    select: { id: true },
  });

  const validIds = cards.map((c) => c.id);

  if (validIds.length === 0) {
    return NextResponse.json({ message: "No matching cards found." }, { status: 404 });
  }

  await db.flashcard.deleteMany({ where: { id: { in: validIds } } });

  return NextResponse.json({ ok: true, deletedCount: validIds.length });
}
