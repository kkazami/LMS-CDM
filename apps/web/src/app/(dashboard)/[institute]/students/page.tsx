import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import type { InstituteTheme } from "@/lib/theme";
import { getDashboardCalendar } from "@/lib/student-calendar-data";
import { schoolDateKey } from "@/lib/student-calendar";
import StudentDashboardClient from "./client";

export const dynamic = "force-dynamic";

interface StudentDashboardProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function StudentDashboardPage({ params }: StudentDashboardProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/students/page.tsx", await params);

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role !== "STUDENT") redirect(`/${institute}`);

  const calendarPromise = getDashboardCalendar(session.user, institute);
  const theme: InstituteTheme = getInstituteTheme(institute);
  const studentId = session.user.id;

  const instituteRecord = session.user.institute;
  if (instituteRecord.code.toLowerCase() !== institute.toLowerCase()) {
    redirect(`/login?institute=${institute}`);
  }

  const gamificationPromise = db.gamificationProfile.findUnique({
    where: { studentId },
    select: { exp: true, loginStreakCurrent: true, level: true },
  });

  // 1. Fetch student's approved enrolled courses
  const [enrollments, gamification] = await Promise.all([
    db.enrollment.findMany({
      where: {
        studentId,
        status: "APPROVED",
        course: {
          instituteId: instituteRecord.id,
          isArchived: false,
        },
      },
      select: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            section: true,
            room: true,
            description: true,
            coverImage: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { displayOrderIndex: "asc" },
    }),
    gamificationPromise,
  ]);

  const enrolledCourses = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    code: e.course.code,
    section: e.course.section,
    room: e.course.room,
    description: e.course.description,
    coverImage: e.course.coverImage ?? "",
    instructorName: e.course.instructor?.name ?? null,
  }));

  const courseIds = enrolledCourses.map((c) => c.id);

  // 3. Fetch classwork due in the next 7 days (or overdue and pending)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rawDueSoon = await db.syllabusItem.findMany({
    where: {
      courseId: { in: courseIds },
      type: { not: "MATERIAL" },
      submissions: { none: { studentId, status: { in: ["SUBMITTED", "GRADED", "RETURNED"] } } },
      dueDate: {
        not: null,
        lte: sevenDaysFromNow,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const dueSoonItems = rawDueSoon.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueDate: item.dueDate!.toISOString(),
    courseId: item.course.id,
    courseTitle: item.course.title,
    courseCode: item.course.code,
    courseSection: item.course.section,
  }));

  const calendar = await calendarPromise;
  const typingSessionKey = `cdm_typed_${studentId.slice(0, 8)}`;

  return (
    <StudentDashboardClient
      userName={session.user.name as string}
      instituteName={instituteRecord.name}
      instituteCode={institute}
      theme={theme}
      initialCourses={enrolledCourses}
      calendar={calendar}
      userId={studentId}
      today={schoolDateKey(now)}
      dueSoonItems={dueSoonItems}
      serverNow={now.toISOString()}
      exp={gamification?.exp ?? 0}
      streakCurrent={gamification?.loginStreakCurrent ?? 1}
      level={gamification?.level ?? 1}
      typingSessionKey={typingSessionKey}
    />
  );
}
