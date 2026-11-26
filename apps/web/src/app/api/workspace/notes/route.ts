import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../_shared";
import { safeRichText } from '@/lib/safe-rich-text';

export const dynamic = "force-dynamic";

const noteSchema = z.object({
  title: z.string().max(200),
  content: z.string().max(100000).transform(safeRichText),
  category: z.string().max(100),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  pinned: z.boolean(),
  archived: z.boolean(),
  orderIndex: z.number().int(),
}).partial();

const noteUpdateSchema = noteSchema.extend({
  id: z.string().min(1),
});

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET workspace/notes/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
      ? NextResponse.json({ ...note, content: safeRichText(note.content) })
      : NextResponse.json({ message: "Note not found." }, { status: 404 });
  }

  const notes = await db.note.findMany({
    where: {
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes.map(note => ({ ...note, content: safeRichText(note.content) })));
}

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST workspace/notes/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json().catch(() => null);
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
  const ceilingDenial = await denyLegacyApi(request, "PATCH workspace/notes/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = noteUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, ...data } = parsed.data;
  const [note] = await db.note.updateManyAndReturn({
    where: {
      id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    data,
  });

  if (!note) {
    return NextResponse.json({ message: "Note not found." }, { status: 404 });
  }

  return NextResponse.json({ ...note, content: safeRichText(note.content) });
}

export async function DELETE(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "DELETE workspace/notes/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
