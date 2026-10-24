import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import SecurityToolsClient from '@/components/admin/SecurityToolsClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function SecurityPage({ params }: PageProps) {
  await requireLegacyActor('apps/web/src/app/(dashboard)/[institute]/security/page.tsx', await params);

  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = session.user.role.toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPER_USER') {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  return <SecurityToolsClient theme={theme} instituteCode={institute} />;
}
