import Link from 'next/link';
import { PageTutorial } from './PageTutorial';
import { CircuitBoard } from 'lucide-react';
import type { ComponentKind, Question } from '../domain/types';

export function Banner({ staff = false }: { staff?: boolean }) {
  return <><header className="ohm-banner"><div className="ohm-mark"><div className="ohm-mark-icon"><CircuitBoard aria-hidden="true" size={28}/></div><div><h1>Ohmward</h1><p>Every circuit starts a journey.</p></div></div><nav className="ohm-actions" aria-label="Ohmward">{staff ? <Link className="ohm-button ohm-secondary" href="/ics/activities/ohmward/modules/circuitry">Preview curriculum</Link> : <><Link data-ohm-tour="journey" href="/ics/activities/ohmward" className="ohm-button ohm-secondary">Journey</Link><Link href="/ics/activities/ohmward/progress" className="ohm-button ohm-secondary">My progress</Link><Link href="/ics/activities/ohmward/sandbox" className="ohm-button ohm-secondary">Sandbox</Link></>}</nav></header><PageTutorial/></>;
}
export function AssessmentSymbol({ drawing }: { drawing: NonNullable<Question['drawing']> }) {
  return <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={drawing.description}>{drawing.paths.map((d,i)=><path key={i} d={d}/>)}</svg>;
}
export function ComponentSymbol({ kind, size = 72, named = false, closed = false }: { kind: ComponentKind; size?: number; named?: boolean; closed?: boolean }) {
  const paths: Record<ComponentKind, React.ReactNode> = {
    battery: <><path d="M8 36H29M43 36H64M29 16V56M43 25V47"/><path d="M18 18H24M21 15V21" strokeWidth="1.5"/></>,
    resistor: <path d="M5 36H16L20 25L27 47L34 25L41 47L48 25L54 36H67"/>,
    led: <><path d="M6 40H22M49 40H65M22 26L47 40L22 54ZM48 26V54M38 19L49 8M45 8H49V12M50 23L61 12M57 12H61V16"/></>,
    switch: <><path d={closed ? 'M5 43H22M50 43H67M24 43H48' : 'M5 43H22M50 43H67M24 40L48 22'}/><circle cx="22" cy="43" r="3"/><circle cx="50" cy="43" r="3"/></>,
    ground: <path d="M36 7V34M14 34H58M21 44H51M28 54H44"/>,
    capacitor: <path d="M5 36H29M43 36H67M29 18V54M43 18V54"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={named ? `${kind} symbol` : 'Circuit symbol'}>{paths[kind]}</svg>;
}
