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

  // Compute activity eligibility for the sidebar — this check is fast
  // (single DB lookup for institute code) and cached per request via Prisma.
  const activityEligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  // Fetch enrolled courses for the student sidebar accordion.
  // Only query if the user is a student to avoid unnecessary DB calls.
  const isStudent = (session.user.role as string).toUpperCase() === "STUDENT";
  let enrolledCourses: { id: string; title: string; code: string }[] = [];

  if (isStudent) {
    const instituteRecord = await db.institute.findUnique({
      where: { code: institute.toLowerCase() },
      select: { id: true },
    });

    if (instituteRecord) {
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
    }
  }

  return (
    <DashboardLayout
      instituteCode={theme.code}
      instituteName={theme.name}
      userName={session.user.name as string}
      userRole={session.user.role as string}
      studentNumber={(session.user.studentNumber as string | undefined) || null}
      theme={theme}
      isEligibleForActivities={activityEligible}
      enrolledCourses={enrolledCourses}
    >
      {children}
    </DashboardLayout>
  );
}
