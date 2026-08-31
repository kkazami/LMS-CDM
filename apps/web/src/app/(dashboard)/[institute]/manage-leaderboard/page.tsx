import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import ManageLeaderboardClient from "./client";

export const dynamic = "force-dynamic";

export default async function ManageLeaderboardPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  // 1. Fetch courses taught by the instructor or all courses if admin
  const taughtCourses = await db.course.findMany({
    where: role === "ADMIN" ? {} : { instructorId: session.user.id },
    select: {
      id: true,
      title: true,
      code: true,
    },
    orderBy: { code: "asc" },
  });

  // 2. Fetch existing grade incentive rules
  const rules = await db.gradeIncentiveRule.findMany({
    where: role === "ADMIN" ? {} : { createdBy: session.user.id },
    include: {
      course: { select: { id: true, title: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch students enrolled in instructor's courses (for direct commendations)
  const courseIds = taughtCourses.map((c) => c.id);
  const enrolledStudents = await db.enrollment.findMany({
    where: {
      courseId: { in: courseIds },
      status: "APPROVED",
    },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
        },
      },
      course: {
        select: {
          id: true,
          code: true,
        },
      },
    },
    distinct: ["studentId"],
  });

  // 4. Fetch recent grade incentive transaction logs
  const recentIncentiveTransactions = await db.expTransaction.findMany({
    where: {
      source: "grade_incentive",
    },
    include: {
      user: { select: { name: true, email: true, studentNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const serializedRules = rules.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseTitle: r.course.title,
    courseCode: r.course.code,
    label: r.label,
    gradeMin: r.gradeMin,
    bonusExp: r.bonusExp,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  }));

  const serializedStudents = enrolledStudents.map((e) => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
    studentNumber: e.student.studentNumber,
    courseId: e.course.id,
    courseCode: e.course.code,
  }));

  const serializedLogs = recentIncentiveTransactions.map((t) => ({
    id: t.id,
    studentName: t.user.name,
    studentNumber: t.user.studentNumber,
    amount: t.amount,
    reason: t.reason,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <ManageLeaderboardClient
      theme={theme}
      instituteCode={institute}
      courses={taughtCourses}
      initialRules={serializedRules}
      students={serializedStudents}
      logs={serializedLogs}
    />
  );
}
