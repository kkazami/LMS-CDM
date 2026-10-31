import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { isEligibleKxInstituteCode } from "@/lib/kx-eligibility";
import { isIteInstituteCode } from "@/lib/ite/ite-eligibility";
import { db } from "@/lib/db";
import { getPHTDateString, getPHTMidnight, processLoginReward } from "@/lib/gamification/login-rewards";
import { getInstituteByCode, getStudentEnrollments } from "@/lib/dashboard-data";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SuperUserShell from '@/components/super-user-v1/SuperUserShell';
import { canonicalRole, supportedInstitute } from '@/lib/super-user-v1/capabilities';
import { notFound } from 'next/navigation';
import { needsClassEnrollment } from '@/lib/student-access';

export const dynamic = "force-dynamic";

export default async function InstituteLayout({
  children,
  params
}: {
  children: React.ReactNode,
  params: Promise<{ institute: string }>
}) {
  const { institute } = await params;
  const session = await getSession(undefined, { allowUnenrolled: true });

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }
  if (await needsClassEnrollment(session.user)) redirect('/join-class');

  const dedicatedRole = canonicalRole(session.user.role);
  if (dedicatedRole === 'SUPER_USER') {
    if (!supportedInstitute(institute)) notFound();
    return <SuperUserShell key={institute.toLowerCase()} institute={institute.toLowerCase()} userName={session.user.name}>{children}</SuperUserShell>;
  }
  if (dedicatedRole === 'UNKNOWN') notFound();

  // Enforce institute scoping: students and teachers are strictly locked to their registered institute.
  // Admins are system administrators who can view, switch, and manage any institute campus.
  const user = session.user as typeof session.user & {
    institute?: { id: string; code: string; name: string };
  };
  const userRole = (user.role || "").toUpperCase();
  const isAdmin = userRole === "ADMIN";

  // Use pre-loaded institute code from session without extra database query
  const userInstituteCode = (user.institute?.code || "ics").toLowerCase();

  if (userInstituteCode !== institute.toLowerCase()) {
    redirect(`/${userInstituteCode}`);
  }

  const theme = getInstituteTheme(institute);

  // Compute activity & KX eligibility synchronously from session (CodeLab is strictly ICS-only)
  const activityEligible = institute.toLowerCase() === "ics" && (userInstituteCode === "ics" || isAdmin);
  const kxEligible = institute.toLowerCase() === "ics" && (userInstituteCode === "ics" || isAdmin);
  const arenaEligible = institute.toLowerCase() === "ibe" && (userInstituteCode === "ibe" || isAdmin);

  const isStudent = userRole === "STUDENT";
  const isProfessor = userRole === "PROFESSOR" || userRole === "TEACHER";

  // Practicum and Meetings are ITE-only (students and their instructors); hidden everywhere else.
  const practicumEligible =
    (isStudent || isProfessor) && isIteInstituteCode(userInstituteCode) && isIteInstituteCode(institute);
  const meetingsEligible = practicumEligible;

  // Focus Mode is ITE-students-only; hidden everywhere else.
  const focusModeEligible = isStudent && isIteInstituteCode(userInstituteCode) && isIteInstituteCode(institute);

  // Use the institute id already loaded with the session when this is the user's own institute
  // (no extra query); only look it up when it is a different one.
  const sessionInstituteId =
    institute.toLowerCase() === userInstituteCode && user.institute?.id ? user.institute.id : null;

  // Students only: the gamification profile. The institute lookup (if needed) runs alongside it.
  const profileSelect = { exp: true, loginStreakCurrent: true, lastDailyRewardAt: true } as const;
  const [targetInstituteId, initialProfile] = await Promise.all([
    sessionInstituteId
      ? Promise.resolve(sessionInstituteId)
      : getInstituteByCode(institute).then((record) => record?.id ?? null),
    isStudent
      ? db.gamificationProfile.findUnique({ where: { studentId: session.user.id }, select: profileSelect })
      : Promise.resolve(null),
  ]);

  // Only run processLoginReward when today's reward is still due (cheap pre-check on
  // lastDailyRewardAt). It is awaited so the streak and EXP shown below already include it.
  let gamification = initialProfile;
  if (isStudent) {
    const rewardedToday = initialProfile?.lastDailyRewardAt
      ? getPHTDateString(initialProfile.lastDailyRewardAt) === getPHTDateString()
      : false;

    if (!rewardedToday) {
      try {
        await processLoginReward(session.user.id);
        gamification = await db.gamificationProfile.findUnique({
          where: { studentId: session.user.id },
          select: profileSelect,
        });
      } catch (err) {
        console.error("Failed to process login reward on layout load:", err);
      }
    }
  }

  const loadSidebarCourses = async (): Promise<{ id: string; title: string; code: string }[]> => {
    if (!targetInstituteId) return [];
    if (isStudent) {
      // Shared with the student dashboard page via React cache (one query per request).
      const enrollments = await getStudentEnrollments(session.user.id, targetInstituteId);
      return enrollments.map((e) => ({ id: e.course.id, title: e.course.title, code: e.course.code }));
    }
    if (isProfessor) {
      return db.course.findMany({
        where: {
          instructorId: session.user.id,
          instituteId: targetInstituteId,
          isArchived: false,
        },
        select: { id: true, title: true, code: true },
        orderBy: { code: "asc" },
      });
    }
    return [];
  };

  // Sidebar courses and today's real daily-login EXP (so the modal shows what was granted).
  const [enrolledCourses, loginExpToday] = await Promise.all([
    loadSidebarCourses(),
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
      isEligibleForOhmward={process.env.OHMWARD_ENABLED === 'true' && institute.toLowerCase() === 'ics' && userInstituteCode === 'ics' && ['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(canonicalRole(userRole))}
      isEligibleForKnowledgeExchange={kxEligible}
      isEligibleForArena={arenaEligible}
      isEligibleForPracticum={practicumEligible}
      isEligibleForMeetings={meetingsEligible}
      isEligibleForFocusMode={focusModeEligible}
      isEligibleForOffline={focusModeEligible}
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
