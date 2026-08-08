import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import type { InstituteTheme } from "@/lib/theme";
import TeacherDashboardClient from "./client";

export const dynamic = "force-dynamic";

interface TeacherDashboardProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function TeacherDashboardPage({ params }: TeacherDashboardProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme: InstituteTheme = getInstituteTheme(institute);
  const teacherId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Fetch non-archived courses taught by this instructor
  const taughtCourses = await db.course.findMany({
    where: {
      instructorId: teacherId,
      instituteId: instituteRecord.id,
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      code: true,
      section: true,
      subject: true,
      room: true,
      description: true,
      coverImage: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
        },
      },
    },
    // We will sort in-memory based on DashboardLayout
  });

  const courseIds = taughtCourses.map((c) => c.id);

  // 1b. Fetch DashboardLayout for explicit order
  const layouts = await db.dashboardLayout.findMany({
    where: { userId: teacherId, courseId: { in: courseIds } },
  });

  const layoutMap = new Map<string, number>();
  for (const layout of layouts) {
    layoutMap.set(layout.courseId, layout.displayOrderIndex);
  }

  // Sort taught courses: first by displayOrderIndex, then fallback to createdAt (newest first)
  taughtCourses.sort((a, b) => {
    const orderA = layoutMap.get(a.id);
    const orderB = layoutMap.get(b.id);

    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // 2. Fetch pending enrollment requests across all taught courses
  const pendingEnrollments = await db.enrollment.findMany({
    where: {
      courseId: { in: courseIds },
      status: "PENDING",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentNumber: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          code: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Count pending per course
  const pendingCountMap = new Map<string, number>();
  for (const p of pendingEnrollments) {
    pendingCountMap.set(p.courseId, (pendingCountMap.get(p.courseId) ?? 0) + 1);
  }

  const courses = taughtCourses.map((c) => ({
    id: c.id,
    title: c.title,
    code: c.code,
    section: c.section,
    subject: c.subject,
    room: c.room,
    description: c.description,
    coverImage: c.coverImage ?? "",
    enrolledCount: c._count.enrollments,
    pendingCount: pendingCountMap.get(c.id) ?? 0,
  }));

  const pendingRequests = pendingEnrollments.map((p) => ({
    id: p.id,
    studentId: p.student.id,
    studentName: p.student.name,
    studentNumber: p.student.studentNumber,
    courseId: p.course.id,
    courseTitle: p.course.title,
    courseCode: p.course.code,
    requestedAt: p.createdAt.toISOString(),
  }));

  return (
    <TeacherDashboardClient
      userName={session.user.name as string}
      instituteName={instituteRecord.name}
      instituteCode={institute}
      theme={theme}
      initialCourses={courses}
      initialPendingRequests={pendingRequests}
    />
  );
}
