import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isEligibleForActivities } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
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

  const theme = getInstituteTheme(institute);

  // Compute activity eligibility for the sidebar
  const activityEligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  const role = (session.user.role as string).toUpperCase();
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";
  let enrolledCourses: { id: string; title: string; code: string }[] = [];

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (instituteRecord) {
    if (isStudent) {
      const enrollments = await db.enrollment.findMany({
        where: {
          studentId: session.user.id,
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
            },
          },
        },
        orderBy: { displayOrderIndex: "asc" },
      });

      enrolledCourses = enrollments.map((e) => e.course);
    } else if (isProfessor) {
      const taught = await db.course.findMany({
        where: {
          instructorId: session.user.id,
          instituteId: instituteRecord.id,
          isArchived: false,
        },
        select: {
          id: true,
          title: true,
          code: true,
        },
        orderBy: { code: "asc" },
      });

      enrolledCourses = taught;
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
      enrolledCourses={enrolledCourses}
    >
      {children}
    </DashboardLayout>
  );
}
