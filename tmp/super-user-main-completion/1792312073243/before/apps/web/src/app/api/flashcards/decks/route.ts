import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../../workspace/_shared";

export const dynamic = "force-dynamic";

/** Enforce student-only access. Returns a 403 response if the user is not a student. */
function requireStudentRole(role: string): NextResponse | null {
  if (role.toUpperCase() !== "STUDENT") {
    return NextResponse.json(
      { message: "Flashcards are only available to students." },
      { status: 403 }
    );
  }
  return null;
}

const deckSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  color: z.string().default("#6366f1"),
  courseId: z.string().nullable().default(null),
  isArchived: z.boolean().default(false),
});

export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");

  const where: Record<string, unknown> = {
    creatorId: session.user.id,
    instituteId: session.user.instituteId,
    isArchived: false,
  };

  if (courseId) {
    where.courseId = courseId;
  }

  const decks = await db.flashcardDeck.findMany({
    where,
    include: {
      course: { select: { title: true } },
      cards: {
        select: {
          id: true,
          progress: {
            where: { userId: session.user.id },
            select: { status: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = decks.map((deck) => {
    const cardCount = deck.cards.length;
    const correctCount = deck.cards.filter(
      (c) => c.progress.length > 0 && c.progress[0].status === "correct"
    ).length;

    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      tags: JSON.parse(deck.tags) as string[],
      color: deck.color,
      courseId: deck.courseId,
      courseTitle: deck.course?.title ?? null,
      creatorId: deck.creatorId,
      instituteId: deck.instituteId,
      isArchived: deck.isArchived,
      cardCount,
      correctCount,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
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
  const parsed = deckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const deck = await db.flashcardDeck.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      tags: JSON.stringify(parsed.data.tags),
      color: parsed.data.color,
      courseId: parsed.data.courseId,
      creatorId: session.user.id,
      instituteId: session.user.instituteId as string,
    },
  });

  return NextResponse.json(
    {
      ...deck,
      tags: parsed.data.tags,
      courseTitle: null,
      cardCount: 0,
      correctCount: 0,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
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
  const updateSchema = deckSchema.partial().extend({ id: z.string().min(1) });
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.flashcardDeck.findFirst({
    where: {
      id: parsed.data.id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Deck not found." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.tags !== undefined) updateData.tags = JSON.stringify(parsed.data.tags);
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
  if (parsed.data.courseId !== undefined) updateData.courseId = parsed.data.courseId;
  if (parsed.data.isArchived !== undefined) updateData.isArchived = parsed.data.isArchived;

  const deck = await db.flashcardDeck.update({
    where: { id: existing.id },
    data: updateData,
  });

  return NextResponse.json({
    ...deck,
    tags: JSON.parse(deck.tags),
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  });
}

export async function DELETE(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const roleBlock = requireStudentRole(session.user.role as string);
  if (roleBlock) return roleBlock;

  const id = getQueryId(request);

  if (!id) {
    return NextResponse.json({ message: "Missing deck id." }, { status: 400 });
  }

  const existing = await db.flashcardDeck.findFirst({
    where: {
      id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Deck not found." }, { status: 404 });
  }

  await db.flashcardDeck.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
