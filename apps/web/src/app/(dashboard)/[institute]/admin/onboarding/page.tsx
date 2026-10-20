import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { notFound } from 'next/navigation';
import RosterOnboarding from '@/components/admin/RosterOnboarding';
export default async function Page({ params, searchParams }: { params: Promise<{ institute: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { institute } = await params;
  const actor = await requireLegacyActor('roster-onboarding/page.tsx', { institute });
  if (actor.role !== 'ADMIN') notFound();
  return <RosterOnboarding instituteCode={institute} theme={getInstituteTheme(institute)} initialTab={(await searchParams).tab} />;
}
