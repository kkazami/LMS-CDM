import { labsAvailable, currentLabAttempt } from '@/lib/labs/readiness';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { CalendarEvent } from "@/lib/lms-types";
import { serializeCalendarEvent } from "@/lib/workspace";

export function visibleCalendarEvents(user: { id: string; instituteId: string; role: string }): Prisma.CalendarEventWhereInput {
  const courseAccess: Prisma.CourseWhereInput = user.role === "STUDENT"
    ? { enrollments: { some: { studentId: user.id, status: "APPROVED" } } }
    : user.role === "ADMIN" ? {} : { instructorId: user.id };
  return {
    instituteId: user.instituteId,
    OR: [
      { creatorId: user.id, OR: [{ courseId: null }, { course: { isArchived: false, ...courseAccess } }] },
      { eventType: { not: "personal" }, creator: { role: { in: ["ADMIN", "PROFESSOR", "TEACHER"] } }, OR: [
        { courseId: null },
        { course: { instituteId: user.instituteId, isArchived: false, ...courseAccess } },
      ] },
    ],
  };
}

export async function getDashboardCalendar(user: { id: string; instituteId: string; role: string }, institute: string) {
  const isStudent = user.role === "STUDENT";
  const courseScope: Prisma.CourseWhereInput = {
    instituteId: user.instituteId, isArchived: false,
    ...(isStudent ? { enrollments: { some: { studentId: user.id, status: "APPROVED" } } } : { instructorId: user.id }),
  };
  const [events, courses, assignments] = await Promise.all([
    db.calendarEvent.findMany({
      where: {
        ...visibleCalendarEvents(user),
        ...(!isStudent ? { eventType: { notIn: ["assignment", "exam", "quiz", "submission"] } } : {}),
      },
      include: { course: { select: { title: true, code: true } } },
      orderBy: { eventDate: "asc" },
    }),
    db.course.findMany({
      where: courseScope,
      select: { id: true, title: true, code: true, room: true, scheduleDays: true, scheduleStart: true, scheduleEnd: true, scheduleStartDate: true, scheduleEndDate: true, createdAt: true, instructor: { select: { name: true } } },
    }),
    isStudent ? db.syllabusItem.findMany({
      where: {
        OR: [{ dueDate: { not: null } }, ...await labsAvailable() ? [{ labAssignment: { attempts: { some: { studentId: user.id, status: 'NEEDS_REVISION' as const, revisionDueAt: { not: null } } } } }] : []], type: { not: "MATERIAL" },
        course: courseScope,
        AND: [
          { OR: [{ targetGroups: { none: {} } }, { targetGroups: { some: { group: { members: { some: { studentId: user.id } } } } } }] },
          await visibleSyllabusForms(),
        ],
      },
      include: { course: { select: { code: true, title: true, instructor: { select: { name: true } } } }, labAssignment: await labsAvailable() ? ({ select: { attempts: { where: { studentId: user.id }, select: { status: true, revisionDueAt: true } } } } as const) : false as const },
    }) : Promise.resolve([]),
  ]);
  const assignmentEvents: CalendarEvent[] = assignments.map((item) => ({
    id: `syllabus_${item.id}`, title: item.title, description: item.description,
    professorName: item.course.instructor?.name ?? "", maxPoints: item.maxPoints,
    eventDate: (currentLabAttempt(item.labAssignment)?.status === 'NEEDS_REVISION' ? currentLabAttempt(item.labAssignment)?.revisionDueAt ?? item.dueDate! : item.dueDate!).toISOString(), eventType: ['EXAM', 'QUIZ', 'MIDTERM_EXAM', 'FINAL_EXAM'].includes(item.type) ? "exam" : "assignment",
    deepLink: `/${institute}/courses/${item.courseId}/classwork/${item.id}`,
    courseId: item.courseId, courseTitle: item.course.title, courseCode: item.course.code,
    source: "classwork", creatorId: "", instituteId: user.instituteId,
    createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(),
  }));
  return {
    events: [...events.map((event) => ({ ...serializeCalendarEvent(event), source: event.creatorId === user.id ? "personal" as const : "institution" as const })), ...assignmentEvents],
    schedules: courses.map(({ instructor, createdAt, scheduleStartDate, scheduleEndDate, ...course }) => ({ ...course, scheduleStartDate: scheduleStartDate?.toISOString().slice(0, 10) ?? null, scheduleEndDate: scheduleEndDate?.toISOString().slice(0, 10) ?? null, instructorName: instructor?.name ?? "", createdAt: createdAt.toISOString() })),
  };
}
