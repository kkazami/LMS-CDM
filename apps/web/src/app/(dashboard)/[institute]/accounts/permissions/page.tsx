import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { notFound } from 'next/navigation';
import { administratorInstitute } from '@/lib/administrator-scope';
export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const scope = await params; const actor = await requireLegacyActor('apps/web/src/app/(dashboard)/[institute]/accounts/permissions/page.tsx', scope);
  if (actor.role !== 'ADMIN') notFound();
  await administratorInstitute(actor, scope.institute);
  return <section><h1 className="text-2xl font-semibold">Administrator access</h1><p className="mt-3">Your permissions apply only to your own institute. Global role permissions cannot be changed here. Super User manages Administrator accounts.</p></section>;
}
