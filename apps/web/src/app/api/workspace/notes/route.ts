import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../_shared";

const noteSchema = z.object({
  title: z.string().default(""),
  content: z.string().default(""),
  category: z.string().default("General"),
  color: z.string().default("#ffffff"),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (id) {
    const note = await db.note.findFirst({
      where: {
        id,
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
      },
    });

    return note
      ? NextResponse.json(note)
      : NextResponse.json({ message: "Note not found." }, { status: 404 });
  }

  const notes = await db.note.findMany({
    where: {
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const note = await db.note.create({
    data: {
      ...parsed.data,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const payloadSchema = noteSchema.extend({ id: z.string().min(1) });
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.note.findFirst({
    where: {
      id: parsed.data.id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Note not found." }, { status: 404 });
  }

  const note = await db.note.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json(note);
}

export async function DELETE(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (!id) {
    return NextResponse.json({ message: "Missing note id." }, { status: 400 });
  }

  const existing = await db.note.findFirst({
    where: {
      id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Note not found." }, { status: 404 });
  }

  await db.note.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}