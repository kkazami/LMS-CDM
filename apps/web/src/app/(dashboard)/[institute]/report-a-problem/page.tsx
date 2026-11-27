import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import ReportProblemForm from '@/components/support/ReportProblemForm';

export const metadata = { title: 'Report a problem' };

export default async function ReportProblemPage({ params }: { params: Promise<{ institute: string }> }) {
  const { institute } = await params;
  await requireLegacyActor('apps/web/src/app/(dashboard)/[institute]/report-a-problem/page.tsx', { institute });
  return <ReportProblemForm theme={getInstituteTheme(institute)} />;
}
