import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession, getQueryId } from "../_shared";
import { calendarEventSchema as eventSchema } from "@/lib/calendar-validation";
import { visibleCalendarEvents, getDashboardCalendar } from "@/lib/student-calendar-data";

export const dynamic = "force-dynamic";

async function canUseCourse(courseId: string | null | undefined, user: { id: string; instituteId: string; role: string }) {
  if (!courseId) return true;
  return !!await db.course.findFirst({ where: {
    id: courseId, instituteId: user.instituteId, isArchived: false,
    ...(user.role === "STUDENT" ? { enrollments: { some: { studentId: user.id, status: "APPROVED" } } }
      : user.role === "ADMIN" ? {} : { instructorId: user.id }),
  }, select: { id: true } });
}

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET workspace/events/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  if (new URL(request.url).searchParams.get('view') === 'agenda') {
    return NextResponse.json(await getDashboardCalendar(session.user, session.user.institute.code.toLowerCase()), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const id = getQueryId(request);

  if (id) {
    const event = await db.calendarEvent.findFirst({
      where: {
        id,
        ...visibleCalendarEvents(session.user),
      },
      include: { course: { select: { title: true, code: true } } },
    });

    return event
      ? NextResponse.json(event)
      : NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  const events = await db.calendarEvent.findMany({
    where: visibleCalendarEvents(session.user),
    include: { course: { select: { title: true, code: true } } },
    orderBy: [{ eventDate: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST workspace/events/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (!await canUseCourse(parsed.data.courseId, session.user)) {
    return NextResponse.json({ message: "Course not found." }, { status: 403 });
  }
  const event = await db.calendarEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      professorName: parsed.data.professorName,
      maxPoints: parsed.data.maxPoints ?? null,
      eventDate: new Date(parsed.data.eventDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      eventType: parsed.data.eventType,
      deepLink: parsed.data.deepLink,
      courseId: parsed.data.courseId ?? null,
      creatorId: session.user.id,
      instituteId: session.user.instituteId,
    },
    include: { course: { select: { title: true, code: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}

export async function PATCH(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH workspace/events/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();

  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  const id = body && typeof body.id === "string" ? body.id : "";

  if (!parsed.success || !id) {
    return NextResponse.json(
      { message: "Validation failed." },
      { status: 400 }
    );
  }

  const existing = await db.calendarEvent.findFirst({
    where: {
      id,
      instituteId: session.user.instituteId,
      creatorId: session.user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  if (!await canUseCourse(parsed.data.courseId, session.user)) {
    return NextResponse.json({ message: "Course not found." }, { status: 403 });
  }
  const event = await db.calendarEvent.update({
    where: { id: existing.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      professorName: parsed.data.professorName,
      maxPoints: parsed.data.maxPoints ?? null,
      eventDate: new Date(parsed.data.eventDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      eventType: parsed.data.eventType,
      deepLink: parsed.data.deepLink,
      courseId: parsed.data.courseId ?? null,
    },
    include: { course: { select: { title: true, code: true } } },
  });

  return NextResponse.json(event);
}

export async function DELETE(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "DELETE workspace/events/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
      creatorId: session.user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Event not found." }, { status: 404 });
  }

  await db.calendarEvent.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
