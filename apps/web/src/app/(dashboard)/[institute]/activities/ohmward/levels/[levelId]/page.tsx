import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { personalProgress } from '@/features/interactive-activities/ohmward/server/service';
import { getLevel, challengeUnlocked,missingPrerequisites } from '@/features/interactive-activities/ohmward/curriculum/catalog';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { LevelExperience } from '@/features/interactive-activities/ohmward/components/LevelExperience';

export default async function Page({ params }: { params: Promise<{ institute: string; levelId: string }> }) {
  const { institute, levelId } = await params, actor = await pageActor(institute), level = getLevel(levelId); if (!level) notFound();
  const data = actor.role === 'STUDENT' ? await personalProgress(actor) : null;
  const unlocked = !data || challengeUnlocked(levelId, data.primerCompleted, data.progress.filter(item => item.firstPassedAt).map(item => item.levelId));
  const prerequisites=data?missingPrerequisites(level,data.primerCompleted,data.progress.filter(item=>item.firstPassedAt).map(item=>item.levelId)):[];
  return <><Banner staff={actor.role !== 'STUDENT'}/><LevelExperience key={`${actor.id}:${level.id}:${level.version}`} level={level} unlocked={unlocked} prerequisites={prerequisites} preview={actor.role !== 'STUDENT'}/></>;
}
