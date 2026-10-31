import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Radio, Cpu, GitBranch } from 'lucide-react';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { personalProgress } from '@/features/interactive-activities/ohmward/server/service';
import { LEVELS, MODULES } from '@/features/interactive-activities/ohmward/curriculum/catalog';
import { Banner, ComponentSymbol } from '@/features/interactive-activities/ohmward/components/Shared';
import { LampDemo } from '@/features/interactive-activities/ohmward/components/Primer';

export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const actor = await pageActor((await params).institute); if (actor.role !== 'STUDENT') redirect('/ics/activities/ohmward/instructor');
  const data = await personalProgress(actor), completed = data.progress.filter(row => row.firstPassedAt).length;
  const destination = !data.primerCompleted ? '/ics/activities/ohmward/primer' : data.lastLevelId ? `/ics/activities/ohmward/levels/${data.lastLevelId}` : '/ics/activities/ohmward/modules/circuitry';
  return <><Banner/><section className="ohm-intro ohm-surface"><div><h2>Small experiments.<br/>Real understanding.</h2><p className="ohm-muted">Learn what each part does, make a connection, and discover why it works. Your first circuit begins here.</p><Link className="ohm-button" href={destination}>{data.primerCompleted ? 'Continue learning' : 'Start the introduction'}<ArrowRight size={18} aria-hidden="true"/></Link><p className="ohm-status" style={{ marginTop: 20 }}>{completed} of 30 levels passed · 30 levels available</p></div><LampDemo/></section><section aria-label="Learning modules"><h2>Your journey</h2>{MODULES.map((module, i) => { const delivered = LEVELS.filter(level=>level.moduleId===module.id), passed = data.progress.filter(row=>row.firstPassedAt && delivered.some(level=>level.id===row.levelId)).length; const Icon = [null, Radio, Cpu, GitBranch][i]; return <article className="ohm-module-row" key={module.id}><div className="ohm-symbol">{Icon ? <Icon aria-hidden="true" size={30}/> : <ComponentSymbol kind="resistor" size={36}/>}</div><div><h3>{module.title}</h3><p className="ohm-muted">{module.description}</p><span className="ohm-status">{module.titles.length} levels · {delivered.length ? `${passed} passed · ${delivered.length} available` : 'Coming soon'}</span></div><Link className="ohm-button ohm-secondary" href={`/ics/activities/ohmward/modules/${module.id}`}>View module <ArrowRight size={16} aria-hidden="true"/></Link></article>; })}</section><p className="ohm-muted" style={{ marginTop: 24 }}>Explore freely with the parts you have unlocked. <Link href="/ics/activities/ohmward/sandbox">Open your saved sandbox.</Link></p></>;
}
