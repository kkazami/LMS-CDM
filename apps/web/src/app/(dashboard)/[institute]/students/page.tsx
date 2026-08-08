import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import type { InstituteTheme } from "@/lib/theme";
import StudentDashboardClient from "./client";

export const dynamic = "force-dynamic";

interface StudentDashboardProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function StudentDashboardPage({ params }: StudentDashboardProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme: InstituteTheme = getInstituteTheme(institute);
  const studentId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Fetch student's approved enrolled courses
  const enrollments = await db.enrollment.findMany({
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
  });

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

  // 2. Fetch submissions to exclude completed classwork
  const submissions = await db.studentSubmission.findMany({
    where: {
      studentId,
      syllabusItem: { courseId: { in: courseIds } },
    },
    select: { syllabusItemId: true, status: true },
  });

  const submittedIds = new Set(
    submissions
      .filter((s) => ["SUBMITTED", "GRADED", "RETURNED"].includes(s.status))
      .map((s) => s.syllabusItemId)
  );

  // 3. Fetch classwork due in the next 7 days (or overdue and pending)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rawDueSoon = await db.syllabusItem.findMany({
    where: {
      courseId: { in: courseIds },
      type: { not: "MATERIAL" },
      id: { notIn: [...submittedIds] },
      dueDate: {
        not: null,
        lte: sevenDaysFromNow,
      },
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

  return (
    <StudentDashboardClient
      userName={session.user.name as string}
      instituteName={instituteRecord.name}
      instituteCode={institute}
      theme={theme}
      initialCourses={enrolledCourses}
      dueSoonItems={dueSoonItems}
      serverNow={now.toISOString()}
    />
  );
}
