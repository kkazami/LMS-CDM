'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MousePointer2, X } from 'lucide-react';
import type { Guide } from '../domain/guidance';

type Placement = { target: { left: number; top: number; width: number; height: number } };

/** Observes real controls. Never clicks them, chooses answers, or invokes an assessment API. */
export function Tutorial({ guide, autoStart = false, onSessionChange }: { guide: Guide; autoStart?: boolean; onSessionChange?: (active: boolean) => void }) {
  const [open, setOpen] = useState(false), [index, setIndex] = useState(0), [finished, setFinished] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const host = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const id = useId(), animate = useReducedMotion() === false, step = guide.steps[index];
  function end() { setOpen(false); onSessionChange?.(false); trigger.current?.focus({ preventScroll: true }); }
  useEffect(() => { if (autoStart) setOpen(true); }, [autoStart]);

  useEffect(() => {
    if (!open || !step) return;
    const root = host.current?.closest('.ohmward');
    if (!root) return;
    let target: HTMLElement | null = null, frame = 0, active = true;
    let previousDescription: string | null = null;
    const originalPadding = (root as HTMLElement).style.paddingBottom;
    const basePadding = parseFloat(getComputedStyle(root).paddingBottom) || 0;
    const visible = (node: HTMLElement) => node.getClientRects().length > 0 && !node.matches(':disabled, [aria-disabled="true"]');
    const candidates = () => Array.from(root.querySelectorAll<HTMLElement>(step.target)).filter(visible);
    const empty = (node: HTMLElement) => 'value' in node && String(node.value).trim() === '';
    const clearTarget = () => {
      if (!target) return;
      target.removeAttribute('data-ohm-tour-current');
      if (previousDescription === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', previousDescription);
    };
    const locate = () => {
      if (!active) return;
      // Reserve room below even the last control, so it can scroll above the docked coachmark.
      (root as HTMLElement).style.paddingBottom = `${basePadding + window.innerHeight * .42 + 100}px`;
      const options = candidates();
      const next = step.allAnswers ? options.find(empty) ?? options[0] : options[0];
      if (!next) { clearTarget(); target = null; setPlacement(null); return; }
      if (target !== next) {
        clearTarget(); target = next;
        previousDescription = target.getAttribute('aria-describedby');
        target.setAttribute('aria-describedby', [previousDescription, `${id}-instruction`].filter(Boolean).join(' '));
        target.setAttribute('data-ohm-tour-current', 'true');
        target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: animate ? 'smooth' : 'instant' });
        target.focus({ preventScroll: true });
      }
      const rect = target.getBoundingClientRect();
      setPlacement(old => {
        const nextPlacement = { target: { left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 } };
        return old && JSON.stringify(old) === JSON.stringify(nextPlacement) ? old : nextPlacement;
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(locate); };
    const perform = (event: Event) => {
      if (!target || !(event.target instanceof Node) || !target.contains(event.target) || event.type !== step.event) return;
      if (step.allAnswers && candidates().some(empty)) { schedule(); return; }
      // React's own handlers retain control of navigation, saves and submission.
      if (index === guide.steps.length - 1) { setOpen(false); setFinished(true); }
      else { setPlacement(null); setIndex(value => value + 1); }
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); onSessionChange?.(false); trigger.current?.focus({ preventScroll: true }); } };
    const resize = new ResizeObserver(schedule);
    resize.observe(root); if (panel.current) resize.observe(panel.current);
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'open'] });
    root.addEventListener('click', perform); root.addEventListener('change', perform);
    window.addEventListener('scroll', schedule, true); window.addEventListener('resize', schedule); window.addEventListener('keydown', escape);
    locate();
    return () => {
      active = false; cancelAnimationFrame(frame); clearTarget(); resize.disconnect(); mutation.disconnect();
      (root as HTMLElement).style.paddingBottom = originalPadding;
      root.removeEventListener('click', perform); root.removeEventListener('change', perform);
      window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); window.removeEventListener('keydown', escape);
    };
  }, [open, index, step, guide.steps.length, id, animate, onSessionChange]);

  return <section ref={host} className="ohm-guide" aria-label={guide.title}>
    <div className="ohm-guide-heading"><div><h3><MousePointer2 size={18} aria-hidden="true"/>{guide.title}</h3><p className="ohm-muted">{finished ? 'Walkthrough finished. You can restart it whenever you need.' : 'Follow the outline and use the real controls. Each action opens the next step.'}</p></div>
      <button type="button" ref={trigger} className="ohm-button ohm-secondary" aria-expanded={open} onClick={() => { if (open) end(); else { setIndex(0); setPlacement(null); setOpen(true); onSessionChange?.(true); } }}>{open ? 'End walkthrough' : finished ? 'Restart walkthrough' : 'Guide me'}</button>
    </div>
    {open && createPortal(<div className="ohmward ohm-tour-layer">
      {placement && <motion.div aria-hidden="true" className="ohm-tour-spotlight" initial={false} animate={placement.target} transition={{ duration: animate ? .2 : 0, ease: [.16, 1, .3, 1] }}/>}
      <div ref={panel} className="ohm-tour-callout" role="region" aria-label="Guided walkthrough">
        <button type="button" className="ohm-tour-close" aria-label="End walkthrough" onClick={end}><X size={18} aria-hidden="true"/></button>
        <div id={`${id}-instruction`} role="status" aria-live="polite" aria-atomic="true"><p className="ohm-status">Step {index + 1} of {guide.steps.length}</p><h3>{step.title}</h3><p>{step.body}</p></div>
        <p className="ohm-tour-wait">{placement ? step.event === 'change' ? 'Change the outlined control to continue.' : 'Click the outlined control to continue.' : 'Waiting for this control to become available. You can end the walkthrough at any time.'}</p>
        <button type="button" className="ohm-button ohm-secondary" onClick={end}>End walkthrough</button>
      </div>
    </div>, document.body)}
  </section>;
}
