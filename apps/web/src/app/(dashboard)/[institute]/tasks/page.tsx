import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";
import { serializeCalendarEvent, serializeNote, serializeTask } from "@/lib/workspace";
import type { CalendarEvent } from "@/lib/lms-types";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function TasksPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // Get student enrollments to know which courses they belong to
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId: session.user.id,
      status: "APPROVED",
      course: { instituteId: session.user.instituteId, isArchived: false },
    },
    select: { courseId: true },
  });

  const enrolledCourseIds = enrollments.map((e) => e.courseId);

  const [notes, tasks, events, courses, syllabusItems] = await Promise.all([
    db.note.findMany({
      where: { creatorId: session.user.id, instituteId: session.user.instituteId },
      orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
    }),
    db.taskItem.findMany({
      where: { creatorId: session.user.id, instituteId: session.user.instituteId },
      include: { course: { select: { title: true } } },
      orderBy: [{ completed: "asc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
    }),
    db.calendarEvent.findMany({
      where: { instituteId: session.user.instituteId },
      include: { course: { select: { title: true } } },
      orderBy: [{ eventDate: "asc" }, { updatedAt: "desc" }],
    }),
    db.course.findMany({
      where: { instituteId: session.user.instituteId },
      select: { id: true, title: true, code: true },
      orderBy: { title: "asc" },
    }),
    // Fetch professor-created assignments/exams with due dates from enrolled courses
    db.syllabusItem.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
        type: { not: "MATERIAL" },
        dueDate: { not: null },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Convert SyllabusItems into CalendarEvent format so they appear on the calendar
  const assignmentEvents: CalendarEvent[] = syllabusItems.map((item) => ({
    id: `syllabus_${item.id}`,
    title: item.title,
    description: item.description,
    professorName: item.course.instructor?.name ?? "",
    maxPoints: item.maxPoints,
    eventDate: item.dueDate!.toISOString(),
    eventType: item.type === "EXAM" ? "exam" : item.type === "QUIZ" ? "exam" : "assignment",
    deepLink: `/${institute}/courses/${item.courseId}`,
    courseId: item.courseId,
    courseTitle: item.course.title,
    creatorId: "",
    instituteId: session.user.instituteId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  // Merge existing CalendarEvents with SyllabusItem-derived events
  const serializedEvents = events.map(serializeCalendarEvent);
  const allEvents = [...serializedEvents, ...assignmentEvents].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  const theme = getInstituteTheme(institute);

  return (
    <WorkspaceDashboard
      instituteCode={institute}
      notes={notes.map(serializeNote)}
      tasks={tasks.map(serializeTask)}
      events={allEvents}
      courseOptions={courses}
      theme={theme}
    />
  );
}
