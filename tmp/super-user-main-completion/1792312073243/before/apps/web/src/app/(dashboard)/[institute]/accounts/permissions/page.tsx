import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import PermissionsMatrixClient from "@/components/admin/PermissionsMatrixClient";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function PermissionsPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  return <PermissionsMatrixClient theme={theme} />;
}
