'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import styles from './CircuitBackdrop.module.css';

const TRACES = [
  'M-40 170H210L262 222H570L630 162H1050L1110 222H1640',
  'M-40 332H370L418 284H860L918 342H1250L1300 292H1640',
  'M-40 488H150L212 426H640L712 498H1090L1150 438H1640',
  'M-40 648H300L354 702H760L820 642H1360L1416 698H1640',
  'M-40 858H490L548 800H990L1052 862H1280L1338 804H1640',
];

/** Decorative signals only; activity simulations have their own state and traces. */
export function CircuitBackdrop() {
  const pathname = usePathname();
  const enabled = pathname === '/ics/activities/ohmward' || pathname.startsWith('/ics/activities/ohmward/');
  const ref = useRef<HTMLDivElement>(null), glowId = useId();
  const [running, setRunning] = useState(false), [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let inView = false;
    const update = () => setRunning(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    const surface = ref.current?.closest('.ohmward');
    if (surface) observer.observe(surface);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [enabled]);

  if (!enabled) return null;
  return <>
    <div ref={ref} className={styles.backdrop} aria-hidden="true" data-running={running && !paused}>
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="none" focusable="false">
        <defs><filter id={glowId} x="-5%" y="-50%" width="110%" height="200%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="1.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g className={styles.relief} transform="translate(0 2)">{TRACES.map(d => <path key={d} d={d}/>)}</g>
        <g className={styles.traces}>{TRACES.map(d => <path key={d} d={d}/>)}</g>
        <g className={styles.signals}>{TRACES.map((d, index) => <path key={d} d={d} pathLength="1" filter={`url(#${glowId})`} style={{ animationDuration: `${18 + index * 3}s`, animationDelay: `${index * -5}s`, animationDirection: index % 2 ? 'reverse' : 'normal' }}/>)}</g>
      </svg>
    </div>
    <button type="button" className={styles.toggle} onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume circuit background animation' : 'Pause circuit background animation'} title={paused ? 'Resume background animation' : 'Pause background animation'}>
      {paused ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}
    </button>
  </>;
}
