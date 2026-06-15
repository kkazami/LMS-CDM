import DashboardLayout from "@/components/layout/DashboardLayout";
import { getInstituteTheme } from "@/lib/get-institute-theme";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function InstituteDashboardPage({ params }: PageProps) {
  const { institute } = await params;
  const theme = getInstituteTheme(institute);

  return (
    <DashboardLayout
      instituteCode={theme.code}
      instituteName={theme.name}
      pageTitle="Student Dashboard"
      userName="Kirby"
      theme={theme}
    >
      <div>Dashboard content</div>
    </DashboardLayout>
  );
}