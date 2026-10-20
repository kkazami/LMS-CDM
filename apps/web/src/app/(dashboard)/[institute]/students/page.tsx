import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import { isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { getInstituteByCode, getStudentEnrollments, getStudentRank } from "@/lib/dashboard-data";
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
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/students/page.tsx", await params);

  const { institute } = await params;

  if (user.role !== "STUDENT") redirect(`/${institute}`);

  const calendarPromise = getDashboardCalendar(user, institute);
  const theme: InstituteTheme = getInstituteTheme(institute);
  const studentId = user.id;

  const instituteRecord = user.institute;
  if (instituteRecord.code.toLowerCase() !== institute.toLowerCase()) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Independent lookups run together: approved courses (shared with the layout),
  //    gamification profile, and the student's pending join requests.
  const [enrollments, gamification, pendingJoinCount] = await Promise.all([
    getStudentEnrollments(studentId, instituteRecord.id),
    db.gamificationProfile.findUnique({
      where: { studentId },
      select: { exp: true, loginStreakCurrent: true },
    }),
    db.enrollment.count({
      where: {
        studentId,
        status: "PENDING",
        course: { instituteId: instituteRecord.id, isArchived: false },
      },
    }),
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
  const exp = gamification?.exp ?? 0;

  // 2. Classwork due within 7 days or already overdue (never submitted), the student's
  //    submissions, calendar, and the real rank all run in parallel.
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [submissions, rawDueSoon, rank, calendar] = await Promise.all([
    db.studentSubmission.findMany({
      where: {
        studentId,
        syllabusItem: { courseId: { in: courseIds } },
      },
      select: { syllabusItemId: true, status: true },
    }),
    db.syllabusItem.findMany({
      where: {
        courseId: { in: courseIds },
        type: { not: "MATERIAL" },
        dueDate: {
          not: null,
          lte: sevenDaysFromNow,
        },
        // An item with no target groups is for everyone; otherwise only members of a
        // targeted group see it (same rule as lib/skills/group-permission-resolver.ts).
        OR: [
          { targetGroups: { none: {} } },
          { targetGroups: { some: { group: { members: { some: { studentId } } } } } },
        ],
      },
      include: {
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
    }),
    getStudentRank(studentId, instituteRecord.id, exp),
    calendarPromise,
  ]);

  const submittedIds = new Set(
    submissions
      .filter((s) => ["SUBMITTED", "GRADED", "RETURNED"].includes(s.status))
      .map((s) => s.syllabusItemId)
  );

  const dueSoonItems = rawDueSoon
    .filter((item) => !submittedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      dueDate: item.dueDate!.toISOString(),
      courseId: item.course.id,
      courseTitle: item.course.title,
      courseCode: item.course.code,
      courseSection: item.course.section,
    }));

  const typingSessionKey = `cdm_typed_${studentId.slice(0, 8)}`;

  return (
    <StudentDashboardClient
      userName={user.name as string}
      instituteName={instituteRecord.name}
      instituteCode={institute}
      theme={theme}
      initialCourses={enrolledCourses}
      calendar={calendar}
      userId={studentId}
      today={schoolDateKey(now)}
      dueSoonItems={dueSoonItems}
      serverNow={now.toISOString()}
      exp={exp}
      streakCurrent={gamification?.loginStreakCurrent ?? 0}
      rank={rank}
      pendingJoinCount={pendingJoinCount}
      showCodeLab={isEligibleInstituteCode(user.institute?.code ?? "")}
      typingSessionKey={typingSessionKey}
    />
  );
}
