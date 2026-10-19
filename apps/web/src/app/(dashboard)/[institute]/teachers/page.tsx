import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import { isEligibleInstituteCode } from "@/lib/activity-eligibility";
import type { InstituteTheme } from "@/lib/theme";
import { getDashboardCalendar } from "@/lib/student-calendar-data";
import { schoolDateKey } from "@/lib/student-calendar";
import TeacherDashboardClient from "./client";

export const dynamic = "force-dynamic";

interface TeacherDashboardProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function TeacherDashboardPage({ params }: TeacherDashboardProps) {
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/teachers/page.tsx", await params);

  const { institute } = await params;

  const role = user.role.toUpperCase();
  // Admins have no classes of their own: send them to the admin dashboard.
  if (role === "ADMIN") {
    redirect(`/${institute}/admin`);
  }
  if (role !== "PROFESSOR" && role !== "TEACHER") {
    redirect(`/${institute}`);
  }

  const theme: InstituteTheme = getInstituteTheme(institute);
  const teacherId = user.id;

  const instituteRecord = user.institute;
  if (instituteRecord.code.toLowerCase() !== institute.toLowerCase()) {
    redirect(`/login?institute=${institute}`);
  }

  const calendarPromise = getDashboardCalendar({ ...user, instituteId: instituteRecord.id }, institute);

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
      scheduleDays: true,
      scheduleStart: true,
      scheduleEnd: true,
      scheduleStartDate: true,
      scheduleEndDate: true,
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

  const [layouts, pendingEnrollments, pendingWorkSubmissions] = await Promise.all([
    db.dashboardLayout.findMany({
      where: { userId: teacherId, courseId: { in: courseIds } },
    }),
    db.enrollment.findMany({
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
    }),
    db.studentSubmission.findMany({
      where: {
        syllabusItem: {
          courseId: { in: courseIds },
        },
        status: "SUBMITTED",
        OR: [{ grade: null }, { isReturned: false }],
      },
      select: {
        id: true,
        syllabusItemId: true,
        submittedAt: true,
        syllabusItem: {
          select: {
            id: true,
            title: true,
            type: true,
            courseId: true,
          },
        },
      },
    }),
  ]);
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

  // Count pending per course
  const pendingCountMap = new Map<string, number>();
  for (const p of pendingEnrollments) {
    pendingCountMap.set(p.courseId, (pendingCountMap.get(p.courseId) ?? 0) + 1);
  }

  // 3. Count submissions that still need a grade (submitted, no grade yet) per course.
  //    Grouped in the database by item; only the item -> course mapping is loaded, never
  //    the submission rows themselves.
  const pendingByItem = await db.studentSubmission.groupBy({
    by: ["syllabusItemId"],
    where: {
      syllabusItem: { courseId: { in: courseIds } },
      status: "SUBMITTED",
      grade: null,
    },
    _count: { _all: true },
  });

  const pendingItemCourses = pendingByItem.length
    ? await db.syllabusItem.findMany({
        where: { id: { in: pendingByItem.map((g) => g.syllabusItemId) } },
        select: { id: true, courseId: true },
      })
    : [];
  const courseOfItem = new Map(pendingItemCourses.map((i) => [i.id, i.courseId]));
  const pendingWorkCountMap = new Map<string, number>();
  let totalPendingWork = 0;
  for (const group of pendingByItem) {
    const cId = courseOfItem.get(group.syllabusItemId);
    if (!cId) continue;
    pendingWorkCountMap.set(cId, (pendingWorkCountMap.get(cId) ?? 0) + group._count._all);
    totalPendingWork += group._count._all;
  }

  // Build list of classes that have pending work
  const pendingWorkClasses = taughtCourses
    .filter((c) => (pendingWorkCountMap.get(c.id) ?? 0) > 0)
    .map((c) => ({
      courseId: c.id,
      courseTitle: c.title,
      courseCode: c.code,
      section: c.section,
      pendingCount: pendingWorkCountMap.get(c.id) ?? 0,
    }));

  const courses = taughtCourses.map((c) => ({
    id: c.id,
    title: c.title,
    code: c.code,
    section: c.section,
    subject: c.subject,
    room: c.room,
    scheduleDays: c.scheduleDays,
    scheduleStart: c.scheduleStart,
    scheduleEnd: c.scheduleEnd,
    scheduleStartDate: c.scheduleStartDate?.toISOString().slice(0, 10) ?? null,
    scheduleEndDate: c.scheduleEndDate?.toISOString().slice(0, 10) ?? null,
    description: c.description,
    coverImage: c.coverImage ?? "",
    enrolledCount: c._count.enrollments,
    pendingCount: pendingCountMap.get(c.id) ?? 0,
    pendingWorkCount: pendingWorkCountMap.get(c.id) ?? 0,
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

  const typingSessionKey = `cdm_typed_${teacherId.slice(0, 8)}`;
  const calendar = await calendarPromise;

  return (
    <TeacherDashboardClient
      userName={user.name as string}
      instituteName={instituteRecord.name}
      instituteCode={institute}
      theme={theme}
      initialCourses={courses}
      calendar={calendar}
      userId={teacherId}
      today={schoolDateKey(new Date())}
      initialPendingRequests={pendingRequests}
      initialPendingWorkClasses={pendingWorkClasses}
      totalPendingWorkCount={totalPendingWork}
      showCodeLab={isEligibleInstituteCode(user.institute?.code ?? "")}
      typingSessionKey={typingSessionKey}
    />
  );
}
