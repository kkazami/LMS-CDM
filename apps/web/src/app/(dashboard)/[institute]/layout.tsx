import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import { processLoginReward, getPHTDateString } from "@/lib/gamification/login-rewards";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SuperUserShell from '@/components/super-user-v1/SuperUserShell';
import { canonicalRole, supportedInstitute } from '@/lib/super-user-v1/capabilities';
import { notFound } from 'next/navigation';

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

  const role = userRole;
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";

  // Determine institute ID: use in-memory ID if current institute matches user's institute
  let targetInstituteId =
    institute.toLowerCase() === userInstituteCode && user.institute?.id
      ? user.institute.id
      : null;

  if (!targetInstituteId) {
    const instRecord = await db.institute.findUnique({
      where: { code: institute.toLowerCase() },
      select: { id: true },
    });
    targetInstituteId = instRecord?.id || null;
  }

  // Fetch enrolled courses and gamification profile concurrently in a single parallel batch
  const [enrolledCourses, gamification] = await Promise.all([
    (async () => {
      if (!targetInstituteId) return [];
      if (isStudent) {
        const enrollments = await db.enrollment.findMany({
          where: {
            studentId: session.user.id,
            status: "APPROVED",
            course: {
              instituteId: targetInstituteId,
              isArchived: false,
            },
          },
          select: {
            course: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
          orderBy: { displayOrderIndex: "asc" },
        });
        return enrollments.map((e) => e.course);
      } else if (isProfessor) {
        return db.course.findMany({
          where: {
            instructorId: session.user.id,
            instituteId: targetInstituteId,
            isArchived: false,
          },
          select: {
            id: true,
            title: true,
            code: true,
          },
          orderBy: { code: "asc" },
        });
      }
      return [];
    })(),

    isStudent
      ? db.gamificationProfile.findUnique({
          where: { studentId: session.user.id },
          select: { exp: true, loginStreakCurrent: true, lastDailyRewardAt: true },
        })
      : Promise.resolve(null),
  ]);

  // Process daily login reward asynchronously without blocking the layout render if already awarded today
  if (isStudent) {
    const todayStr = getPHTDateString();
    const lastRewardStr = gamification?.lastDailyRewardAt
      ? getPHTDateString(gamification.lastDailyRewardAt)
      : null;

    if (lastRewardStr !== todayStr) {
      processLoginReward(session.user.id).catch((err) => {
        console.error("Failed to process login reward on layout load:", err);
      });
    }
  }

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
      isEligibleForArena={arenaEligible}
      enrolledCourses={enrolledCourses}
      exp={gamification?.exp || 0}
      streakCurrent={gamification?.loginStreakCurrent || 1}
      userId={session.user.id}
    >
      {children}
    </DashboardLayout>
  );
}
