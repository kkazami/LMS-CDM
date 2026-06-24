import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../_shared";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueDate: z.string().datetime().nullable().optional(),
  courseId: z.string().nullable().optional(),
  completed: z.boolean().default(false),
  archived: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (id) {
    const task = await db.taskItem.findFirst({
      where: {
        id,
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
      },
      include: { course: { select: { title: true } } },
    });

    return task
      ? NextResponse.json(task)
      : NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  const tasks = await db.taskItem.findMany({
    where: {
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    include: { course: { select: { title: true } } },
    orderBy: [{ completed: "asc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const task = await db.taskItem.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      courseId: parsed.data.courseId ?? null,
      completed: parsed.data.completed,
      archived: parsed.data.archived,
      orderIndex: parsed.data.orderIndex,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json();
  const payloadSchema = taskSchema.extend({ id: z.string().min(1) });
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.taskItem.findFirst({
    where: {
      id: parsed.data.id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  const task = await db.taskItem.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      courseId: parsed.data.courseId ?? null,
      completed: parsed.data.completed,
      archived: parsed.data.archived,
      orderIndex: parsed.data.orderIndex,
    },
    include: { course: { select: { title: true } } },
  });

  return NextResponse.json(task);
}

export async function DELETE(request: Request) {
  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const id = getQueryId(request);

  if (!id) {
    return NextResponse.json({ message: "Missing task id." }, { status: 400 });
  }

  const existing = await db.taskItem.findFirst({
    where: {
      id,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  await db.taskItem.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}