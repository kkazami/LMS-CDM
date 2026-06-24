import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../_shared";

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  professorName: z.string().default(""),
  maxPoints: z.number().int().nullable().optional(),
  eventDate: z.string().datetime(),
  eventType: z.string().default("assignment"),
  deepLink: z.string().default("#"),
  courseId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (id) {
    const event = await db.calendarEvent.findFirst({
      where: {
        id,
        instituteId: session.user.instituteId,
      },
      include: { course: { select: { title: true } } },
    });

    return event
      ? NextResponse.json(event)
      : NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const events = await db.calendarEvent.findMany({
    where: { instituteId: session.user.instituteId },
    include: { course: { select: { title: true } } },
    orderBy: [{ eventDate: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const event = await db.calendarEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      professorName: parsed.data.professorName,
      maxPoints: parsed.data.maxPoints ?? null,
      eventDate: new Date(parsed.data.eventDate),
      eventType: parsed.data.eventType,
      deepLink: parsed.data.deepLink,
      courseId: parsed.data.courseId ?? null,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const payloadSchema = eventSchema.extend({ id: z.string().min(1) });
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.calendarEvent.findFirst({
    where: {
      id: parsed.data.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const event = await db.calendarEvent.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      professorName: parsed.data.professorName,
      maxPoints: parsed.data.maxPoints ?? null,
      eventDate: new Date(parsed.data.eventDate),
      eventType: parsed.data.eventType,
      deepLink: parsed.data.deepLink,
      courseId: parsed.data.courseId ?? null,
    },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (!id) {
    return NextResponse.json({ message: "Missing event id." }, { status: 400 });
  }

  const existing = await db.calendarEvent.findFirst({
    where: {
      id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  await db.calendarEvent.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}