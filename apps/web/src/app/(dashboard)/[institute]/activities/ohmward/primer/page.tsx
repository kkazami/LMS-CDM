import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { Primer } from '@/features/interactive-activities/ohmward/components/Primer';
export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const actor = await pageActor((await params).institute);
  return <><Banner staff={actor.role !== 'STUDENT'}/><Primer preview={actor.role !== 'STUDENT'}/></>;
}
