import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import ManageLeaderboardClient from "./client";
import { leaderboardCourseWhere, rankedSubmissionWhere } from "@/lib/activity-leaderboard";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";

export const dynamic = "force-dynamic";

export default async function ManageLeaderboardPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/page.tsx", await params);

  const { institute } = await params;

  const role = canonicalRole(user.role);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  const [taughtCourses, rules, recentIncentiveTransactions] = await Promise.all([
    db.course.findMany({
      where: leaderboardCourseWhere(user),
      select: {
        id: true,
        title: true,
        code: true,
      },
      orderBy: { code: "asc" },
    }),
    db.gradeIncentiveRule.findMany({
      where: role === "ADMIN" ? { course: { instituteId: user.instituteId } } : { createdBy: user.id },
      include: {
        course: { select: { id: true, title: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.expTransaction.findMany({
      where: {
        source: "grade_incentive",
        user: { instituteId: user.instituteId },
      },
      include: {
        user: { select: { name: true, email: true, studentNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const courseIds = taughtCourses.map(c => c.id);
  const [enrolledStudents, classworkActivities] = await Promise.all([
    db.enrollment.findMany({
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
    }),
    db.syllabusItem.findMany({
      where: {
        courseId: { in: courseIds },
        type: { not: "MATERIAL" },
      },
      include: {
        leaderboardRewards: {
          orderBy: { placement: "asc" },
        },
        submissions: {
          where: {
            ...rankedSubmissionWhere,
            student: { isActive: true, role: "STUDENT", instituteId: user.instituteId },
          },
          select: { studentId: true },
        },
      },
      orderBy: [
        { course: { code: "asc" } },
        { createdAt: "desc" },
      ],
    }),
  ]);

  const serializedRules = rules.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseTitle: r.course.title,
    courseCode: r.course.code,
    label: r.label,
    gradeMin: r.gradeMin,
    bonusExp: r.bonusExp,
    isActive: r.isActive,
    rewardDescription: r.rewardDescription,
    createdAt: r.createdAt.toISOString(),
  }));

  const courseById = new Map(taughtCourses.map(course => [course.id, course]));
  const approvedMembers = new Set(enrolledStudents.map(e => `${e.course.id}:${e.student.id}`));
  const serializedActivities = classworkActivities.map((a) => ({
    id: a.id,
    courseId: a.courseId,
    courseCode: courseById.get(a.courseId)!.code,
    courseTitle: courseById.get(a.courseId)!.title,
    title: a.title,
    type: a.type,
    maxPoints: a.maxPoints,
    leaderboardEnabled: a.leaderboardEnabled,
    participantCount: a.submissions.filter(s => approvedMembers.has(`${a.courseId}:${s.studentId}`)).length,
    rewards: a.leaderboardRewards.map((r) => ({
      id: r.id,
      placement: r.placement,
      rewardLabel: r.rewardLabel,
      bonusExp: r.bonusExp,
    })),
  }));

  const uniqueStudents = new Map(enrolledStudents.map(e => [e.student.id, e]));
  const serializedStudents = [...uniqueStudents.values()].map((e) => ({
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
      initialActivities={serializedActivities}
      initialRules={serializedRules}
      students={serializedStudents}
      logs={serializedLogs}
    />
  );
}
