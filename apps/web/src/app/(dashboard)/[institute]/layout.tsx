import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { isEligibleKxInstituteCode } from "@/lib/kx-eligibility";
import { isIteInstituteCode } from "@/lib/ite/ite-eligibility";
import { db } from "@/lib/db";
import { getPHTMidnight, processLoginReward } from "@/lib/gamification/login-rewards";
import { getInstituteByCode, getStudentEnrollments } from "@/lib/dashboard-data";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function InstituteLayout({
  children,
  params
}: {
  children: React.ReactNode,
  params: Promise<{ institute: string }>
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // Enforce institute scoping: students and teachers are strictly locked to their registered institute.
  // Admins are system administrators who can view, switch, and manage any institute campus.
  const userRole = ((session.user as Record<string, unknown>).role as string || "").toUpperCase();
  const isAdmin = userRole === "ADMIN";

  // The session already carries the user's institute, so no extra query is needed.
  const userInstituteCode = session.user.institute?.code?.toLowerCase() ?? "ics";

  if (!isAdmin && userInstituteCode !== institute.toLowerCase()) {
    redirect(`/${userInstituteCode}`);
  }

  const theme = getInstituteTheme(institute);

  // Eligibility is a pure function of the user's institute code (same rule as the guards).
  const activityEligible = isEligibleInstituteCode(userInstituteCode);
  const kxEligible = institute.toLowerCase() === "ics" && isEligibleKxInstituteCode(userInstituteCode);

  const isStudent = userRole === "STUDENT";
  const isProfessor = userRole === "PROFESSOR" || userRole === "TEACHER";

  // Practicum is ITE-only (students and their instructor-supervisors); hidden everywhere else.
  const practicumEligible =
    (isStudent || isProfessor) && isIteInstituteCode(userInstituteCode) && isIteInstituteCode(institute);

  // The institute lookup and the daily reward are independent: run them together.
  const [instituteRecord] = await Promise.all([
    getInstituteByCode(institute),
    isStudent
      ? processLoginReward(session.user.id).catch((err: unknown) => {
          console.error("Failed to process login reward on layout load:", err);
        })
      : Promise.resolve(),
  ]);

  const loadSidebarCourses = async (): Promise<{ id: string; title: string; code: string }[]> => {
    if (!instituteRecord) return [];
    if (isStudent) {
      // Shared with the student dashboard page via React cache (one query per request).
      const enrollments = await getStudentEnrollments(session.user.id, instituteRecord.id);
      return enrollments.map((e) => ({ id: e.course.id, title: e.course.title, code: e.course.code }));
    }
    if (isProfessor) {
      return db.course.findMany({
        where: {
          instructorId: session.user.id,
          instituteId: instituteRecord.id,
          isArchived: false,
        },
        select: { id: true, title: true, code: true },
        orderBy: { code: "asc" },
      });
    }
    return [];
  };

  // After the reward is processed: sidebar courses, gamification profile and today's
  // real daily-login EXP (so the modal shows what was actually granted).
  const [enrolledCourses, gamification, loginExpToday] = await Promise.all([
    loadSidebarCourses(),
    db.gamificationProfile.findUnique({
      where: { studentId: session.user.id },
      select: { exp: true, loginStreakCurrent: true },
    }),
    isStudent
      ? db.expTransaction.aggregate({
          where: {
            userId: session.user.id,
            source: "daily_login",
            createdAt: { gte: getPHTMidnight() },
          },
          _sum: { amount: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <DashboardLayout
      instituteCode={theme.code}
      instituteName={theme.name}
      userName={session.user.name as string}
      userRole={session.user.role as string}
      studentNumber={(session.user.studentNumber as string | undefined) || null}
      avatarUrl={(session.user as Record<string, unknown>).avatarUrl as string | null ?? null}
      theme={theme}
      isEligibleForActivities={activityEligible}
      isEligibleForKnowledgeExchange={kxEligible}
      isEligibleForPracticum={practicumEligible}
      enrolledCourses={enrolledCourses}
      exp={gamification?.exp ?? 0}
      streakCurrent={gamification?.loginStreakCurrent ?? 0}
      loginRewardExp={loginExpToday?._sum.amount ?? 0}
      userId={session.user.id}
    >
      {children}
    </DashboardLayout>
  );
}
