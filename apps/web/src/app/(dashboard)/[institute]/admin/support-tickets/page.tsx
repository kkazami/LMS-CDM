import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import SupportTicketsClient from "./client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function AdminSupportTicketsPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  return <SupportTicketsClient theme={theme} instituteCode={institute} />;
}
