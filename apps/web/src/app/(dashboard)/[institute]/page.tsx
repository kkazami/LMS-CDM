import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function InstituteDashboardPage({ params }: PageProps) {

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = session.user.role.toUpperCase();

  if (role === 'SUPER_USER') redirect(`/${institute}/academic-operations`);
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/page.tsx", await params);

  if (role === "STUDENT") {
    redirect(`/${institute}/students`);
  } else if (role === "PROFESSOR" || role === "TEACHER") {
    redirect(`/${institute}/teachers`);
  } else if (role === "ADMIN") {
    redirect(`/${institute}/admin`);
  }

  // Fallback if role is unknown
  return <div>Unknown role</div>;
}
