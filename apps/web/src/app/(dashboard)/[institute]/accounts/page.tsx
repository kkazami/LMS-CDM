import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import AccountsManagementClient from "@/components/admin/AccountsManagementClient";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function AccountManagementPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  return (
    <AccountsManagementClient
      theme={theme}
      instituteCode={institute}
    />
  );
}
