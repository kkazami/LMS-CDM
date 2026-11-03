import { integrationReady } from '@/features/interactive-activities/ohmward/curriculum/catalog';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { personalProgress } from '@/features/interactive-activities/ohmward/server/service';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { progressSummary } from '@/features/interactive-activities/ohmward/domain/workspace';

export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const actor = await pageActor((await params).institute); if (actor.role !== 'STUDENT') redirect('/ics/activities/ohmward/instructor');
  const { progress } = await personalProgress(actor), summary=progressSummary(progress);
  return <><Banner/><section className="ohm-surface"><h2>{summary.completed===30?'Journey complete':'Your progress'}</h2>{summary.completed===30&&<p className="ohm-feedback" role="status">Every circuit starts a journey. You have passed all 30 levels. Replay any challenge or continue creating in your sandbox.</p>}<p style={{marginTop:12}}>{summary.completed} of 30 levels passed · {summary.stars} stars · {summary.attempts} submitted attempts</p><p className="ohm-muted">All 30 levels are available. Completion uses the full journey. {summary.firstPassXp} first-pass XP earned in Ohmward. Replays preserve best results and do not award first-pass XP again.</p>
    <p className="ohm-feedback">{integrationReady(progress.filter(row=>row.firstPassedAt).map(row=>row.levelId)) ? 'Your Integration foundation gate is open.' : 'Pass Levels 1–6 in Circuitry, Sensors and Microcontrollers to unlock Integration challenges.'} <Link href="/ics/activities/ohmward/modules/integration">View Integration</Link></p><div className="ohm-progress-list">{summary.modules.map(module=><div key={module.prefix}><label htmlFor={`progress-${module.prefix}`}>{module.prefix}: {module.passed}/{module.total} passed</label><progress id={`progress-${module.prefix}`} value={module.passed} max={module.total}>{module.passed}/{module.total}</progress></div>)}</div>
    <div className="ohm-table-wrap"><table><caption>Personal best results · lifetime progress</caption><thead><tr><th scope="col">Level</th><th scope="col">Best score</th><th scope="col">Stars</th><th scope="col">Submitted attempts</th></tr></thead><tbody>{progress.map(item=><tr key={item.levelId}><th scope="row"><Link href={`/ics/activities/ohmward/levels/${item.levelId}`}>{item.levelId}</Link></th><td>{item.bestScore}/100</td><td>{item.bestStars}/3</td><td>{item.submittedCount}</td></tr>)}</tbody></table></div>{!progress.length&&<p className="ohm-feedback">No attempts yet. <Link href="/ics/activities/ohmward/primer">Begin with the introduction.</Link></p>}<Link className="ohm-button ohm-secondary" href="/ics/activities/ohmward/sandbox">Explore your sandbox</Link></section></>;
}
