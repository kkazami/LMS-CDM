import Link from "next/link";
import StudentCalendar from "@/components/calendar/StudentCalendar";
import { getDashboardCalendar } from "@/lib/student-calendar-data";
import { schoolDateKey } from "@/lib/student-calendar";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import WorkspaceDashboard from "@/components/workspace/WorkspaceDashboard";
import { serializeNote, serializeTask } from "@/lib/workspace";
import { safeRichText } from '@/lib/safe-rich-text';

type PageProps = {
  searchParams: Promise<{ view?: string }>;
  params: Promise<{
    institute: string;
  }>;
};

export default async function TasksPage({ params, searchParams }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/tasks/page.tsx", await params);

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const showNotes = (await searchParams).view === "notes";
  const calendar = showNotes ? null : await getDashboardCalendar(session.user, institute);

  const [notes, tasks, courses] = await Promise.all([
    db.note.findMany({
      where: { creatorId: session.user.id, instituteId: session.user.instituteId },
      orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
    }),
    db.taskItem.findMany({
      where: { creatorId: session.user.id, instituteId: session.user.instituteId },
      include: { course: { select: { title: true } } },
      orderBy: [{ completed: "asc" }, { orderIndex: "asc" }, { updatedAt: "desc" }],
    }),
    db.course.findMany({
      where: { instituteId: session.user.instituteId },
      select: { id: true, title: true, code: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const theme = getInstituteTheme(institute);

  return (
    <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Tasks & Calendar</h1><Link className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700" href={`/${institute}/tasks${showNotes ? '' : '?view=notes'}`}>{showNotes ? 'See calendar' : 'See notes & tasks'}</Link></div>
    {calendar ? <StudentCalendar {...calendar} userId={session.user.id} instituteCode={institute} theme={theme} today={schoolDateKey(new Date())} /> : <WorkspaceDashboard
      instituteCode={institute}
      notes={notes.map(note => serializeNote({ ...note, content: safeRichText(note.content) }))}
      tasks={tasks.map(serializeTask)}
      courseOptions={courses}
      theme={theme}
    />}
    </div>
  );
}
