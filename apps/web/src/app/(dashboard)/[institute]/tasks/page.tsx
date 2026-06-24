import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";
import { serializeCalendarEvent, serializeNote, serializeTask } from "@/lib/workspace";

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

  const [notes, tasks, events, courses] = await Promise.all([
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
  ]);

  return (
    <WorkspaceDashboard
      instituteCode={institute}
      notes={notes.map(serializeNote)}
      tasks={tasks.map(serializeTask)}
      events={events.map(serializeCalendarEvent)}
      courseOptions={courses}
    />
  );
}
