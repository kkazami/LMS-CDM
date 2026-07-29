import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { isEligibleForActivities } from "@/lib/activity-eligibility";
import DashboardLayout from "@/components/layout/DashboardLayout";

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

  return (
    <DashboardLayout
      instituteCode={theme.code}
      instituteName={theme.name}
      userName={session.user.name as string}
      userRole={session.user.role as string}
      studentNumber={(session.user.studentNumber as string | undefined) || null}
      theme={theme}
      isEligibleForActivities={activityEligible}
    >
      {children}
    </DashboardLayout>
  );
}

