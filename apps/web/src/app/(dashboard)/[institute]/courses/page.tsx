import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import CoursesClient from "./client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const theme = getInstituteTheme(institute);
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const role = session.user.role.toUpperCase();
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute },
  });

  if (!instituteRecord) {
    redirect(`/${institute}`);
  }

  if (isStudent) {
    // Students: show their enrolled courses (approved, non-archived), ordered by displayOrderIndex
    const enrolledCourses = await db.enrollment.findMany({
      where: {
        studentId: session.user.id,
        status: "APPROVED",
        course: { instituteId: instituteRecord.id, isArchived: false },
      },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
          },
        },
      },
      orderBy: { displayOrderIndex: "asc" },
    });

    // Also get pending enrollment count
    const pendingCount = await db.enrollment.count({
      where: {
        studentId: session.user.id,
        status: "PENDING",
        course: { instituteId: instituteRecord.id },
      },
    });

    const courses = enrolledCourses.map((e) => ({
      id: e.course.id,
      code: e.course.code,
      courseCode: e.course.courseCode,
      title: e.course.title,
      section: e.course.section,
      subject: e.course.subject,
      room: e.course.room,
      instructorName: e.course.instructor?.name || null,
      displayOrderIndex: e.displayOrderIndex,
    }));

    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
        <CoursesClient
          courses={courses}
          instituteCode={institute}
          theme={theme}
          userRole="STUDENT"
          canEdit={false}
          pendingCount={pendingCount}
        />
      </div>
    );
  }

  // Professors: show non-archived courses they teach, ordered by DashboardLayout
  if (isProfessor) {
    const [taughtCourses, layouts] = await Promise.all([
      db.course.findMany({
        where: {
          instructorId: session.user.id,
          instituteId: instituteRecord.id,
          isArchived: false,
        },
        include: {
          instructor: { select: { name: true } },
          _count: {
            select: { enrollments: { where: { status: "APPROVED" } } },
          },
        },
      }),
      db.dashboardLayout.findMany({
        where: { userId: session.user.id },
      }),
    ]);

    const layoutMap = new Map(layouts.map((l) => [l.courseId, l.displayOrderIndex]));

    const courses = taughtCourses
      .map((c) => ({
        id: c.id,
        code: c.code,
        courseCode: c.courseCode,
        title: c.title,
        section: c.section,
        subject: c.subject,
        room: c.room,
        instructorName: c.instructor?.name || null,
        enrolledCount: c._count.enrollments,
        displayOrderIndex: layoutMap.get(c.id) ?? 999,
      }))
      .sort((a, b) => a.displayOrderIndex - b.displayOrderIndex);

    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
        <CoursesClient
          courses={courses}
          instituteCode={institute}
          theme={theme}
          userRole="PROFESSOR"
          canEdit={true}
        />
      </div>
    );
  }

  // Admin: show all non-archived courses
  const allCourses = await db.course.findMany({
    where: { instituteId: instituteRecord.id, isArchived: false },
    include: {
      instructor: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const courses = allCourses.map((c) => ({
    id: c.id,
    code: c.code,
    courseCode: c.courseCode,
    title: c.title,
    section: c.section,
    subject: c.subject,
    room: c.room,
    instructorName: c.instructor?.name || null,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
      <CoursesClient
        courses={courses}
        instituteCode={institute}
        theme={theme}
        userRole="ADMIN"
        canEdit={true}
      />
    </div>
  );
}
