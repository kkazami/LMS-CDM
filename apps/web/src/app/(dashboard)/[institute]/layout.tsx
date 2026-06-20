import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
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

  return (
    <DashboardLayout
      instituteCode={theme.code}
      instituteName={theme.name}
      userName={session.user.name}
      userRole={session.user.role}
      theme={theme}
    >
      {children}
    </DashboardLayout>
  );
}
