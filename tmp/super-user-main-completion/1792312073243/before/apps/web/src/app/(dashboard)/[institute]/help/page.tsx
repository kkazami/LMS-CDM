import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import HelpDashboardClient from "./client";

export const dynamic = "force-dynamic";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const session = await getSession();
  const { institute } = await params;

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);

  return <HelpDashboardClient theme={theme} role={session.user.role} />;
}
