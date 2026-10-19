import { notFound } from 'next/navigation';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { administratorInstitute } from '@/lib/administrator-scope';
import FacultyManagement from '@/components/academic-structure/FacultyManagement';
export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const scope = await params;
  const actor = await requireLegacyActor('apps/web/src/app/(dashboard)/[institute]/admin/faculty/page.tsx', scope);
  if (actor.role !== 'ADMIN') notFound();
  await administratorInstitute(actor, scope.institute);
  if (scope.institute !== 'ics') notFound();
  return <FacultyManagement />;
}
