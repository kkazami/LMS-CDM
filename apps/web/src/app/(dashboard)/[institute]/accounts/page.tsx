import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import AccountsManagementClient from "@/components/admin/AccountsManagementClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function AccountManagementPage({ params }: PageProps) {
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/accounts/page.tsx", await params);

  const { institute } = await params;

  if (user.role.toUpperCase() !== "ADMIN") {
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
