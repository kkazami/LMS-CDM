import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { personalProgress } from '@/features/interactive-activities/ohmward/server/service';
import { MODULES, getLevel, levelId, challengeUnlocked, integrationReady } from '@/features/interactive-activities/ohmward/curriculum/catalog';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';

export default async function Page({ params }: { params: Promise<{ institute: string; moduleId: string }> }) {
  const { institute, moduleId } = await params, actor = await pageActor(institute);
  const module = MODULES.find(item => item.id === moduleId); if (!module) notFound();
  const progress = actor.role === 'STUDENT' ? await personalProgress(actor) : { primerCompleted: true, progress: [] };
  const passed = progress.progress.filter(item => item.firstPassedAt).map(item => item.levelId);
  return <><Banner staff={actor.role !== 'STUDENT'}/><h2>{module.title}</h2><p className="ohm-muted" style={{ marginTop: 8 }}>{module.description}</p>{actor.role === 'STUDENT' && !progress.primerCompleted && <p className="ohm-feedback">Start with the ungraded introduction to unlock your first challenges. <Link href="/ics/activities/ohmward/primer">Open introduction</Link></p>}{module.id === 'integration' && <p className="ohm-feedback">{integrationReady(passed) ? 'Foundation prerequisites passed. Integration challenges open in sequence.' : 'Integration challenges require Levels 1–6 passed in Circuitry, Sensors and Microcontrollers. Stars do not block entry. Lessons remain readable.'}</p>}<ol className="ohm-levels">{module.titles.map((title, i) => {
    const id = levelId(module.id, i), delivered = getLevel(id), unlocked = actor.role !== 'STUDENT' || challengeUnlocked(id, progress.primerCompleted, passed), row = progress.progress.find(item => item.levelId === id);
    return <li className="ohm-level-row" key={id}><div><span className="ohm-status">{id} · {module.id === 'integration' ? i < 2 ? 'Guided' : i < 4 ? 'Semi-guided' : 'Open' : i < 3 ? 'Basic' : i < 6 ? 'Medium' : 'Hard'}</span><h3>{title}</h3><p className="ohm-muted">{!delivered ? 'Coming soon' : row?.firstPassedAt ? `Passed · ${row.bestStars}/3 stars · Best ${row.bestScore}/100` : unlocked ? 'Ready to explore' : 'Lesson open · Challenge requires preceding steps'}</p></div>{delivered && <Link className="ohm-button ohm-secondary" href={`/ics/activities/ohmward/levels/${id}`}>{row?.firstPassedAt ? 'Review or replay' : unlocked ? 'Open level' : 'Read lesson'}</Link>}</li>;
  })}</ol></>;
}
