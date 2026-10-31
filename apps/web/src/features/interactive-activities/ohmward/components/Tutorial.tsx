'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MousePointer2, X } from 'lucide-react';
import type { Guide } from '../domain/guidance';
import { tourBubble, tourCallout, type TourBounds } from './tutorial-motion';

type Placement = { target: TourBounds; area: TourBounds; viewport: { width: number; height: number }; callout: ReturnType<typeof tourCallout> };

function BubbleDimmer({ placement, animate }: { placement: Placement; animate: boolean }) {
  const id = useId(), bubble = tourBubble(placement.target, placement.viewport);
  return <svg className="ohm-tour-dimmer" aria-hidden="true" focusable="false" width="100%" height="100%">
    <defs><clipPath id={`${id}-safe`}><rect x={placement.area.left} y={placement.area.top} width={placement.area.width} height={placement.area.height}/></clipPath>
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={placement.viewport.width} height={placement.viewport.height}>
      <rect width="100%" height="100%" fill="white"/>
      <g clipPath={`url(#${id}-safe)`}><motion.circle fill="black" initial={animate ? { cx: bubble.x, cy: bubble.y, r: bubble.coverRadius } : false}
        animate={{ cx: bubble.x, cy: bubble.y, r: bubble.focusRadius }}
        transition={{ cx: { duration: 0 }, cy: { duration: 0 }, r: { duration: animate ? .6 : 0, ease: [.22, 1, .36, 1] } }}/></g>
    </mask></defs>
    <rect width="100%" height="100%" fill="#070c1670" mask={`url(#${id})`}/>
  </svg>;
}

/** Observes real controls. Never clicks them, chooses answers, or invokes an assessment API. */
export function Tutorial({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false), [index, setIndex] = useState(0), [finished, setFinished] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const host = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const id = useId(), animate = useReducedMotion() === false, step = guide.steps[index];
  function end() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }

  useEffect(() => {
    if (!open || !step) return;
    const root = host.current?.closest('.ohmward');
    if (!root) return;
    let target: HTMLElement | null = null, frame = 0, active = true, revealTarget = true, extraPadding = 0;
    let previousDescription: string | null = null;
    const originalPadding = (root as HTMLElement).style.paddingBottom;
    const basePadding = parseFloat(getComputedStyle(root).paddingBottom) || 0;
    const main = root.closest('main'), topbar = main?.parentElement?.querySelector<HTMLElement>(':scope > header');
    const bottomNav = root.closest('.lms-shell')?.querySelector<HTMLElement>('[data-mobile-bottom-nav]');
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
      const options = candidates();
      const next = step.allAnswers ? options.find(empty) ?? options[0] : options[0];
      if (!next) { clearTarget(); target = null; setPlacement(null); return; }
      if (target !== next) {
        clearTarget(); target = next;
        revealTarget = true;
        previousDescription = target.getAttribute('aria-describedby');
        target.setAttribute('aria-describedby', [previousDescription, `${id}-instruction`].filter(Boolean).join(' '));
        target.setAttribute('data-ohm-tour-current', 'true');
        target.focus({ preventScroll: true });
      }
      const areaLeft = Math.max(12, (main?.getBoundingClientRect().left ?? 0) + 12);
      const areaTop = Math.max(12, (topbar?.getBoundingClientRect().bottom ?? 0) + 12);
      const areaBottom = Math.min(window.innerHeight - 12, bottomNav?.getClientRects().length ? bottomNav.getBoundingClientRect().top - 12 : window.innerHeight - 12);
      const area = { left: areaLeft, top: areaTop, width: Math.max(44, document.documentElement.clientWidth - 12 - areaLeft), height: Math.max(88, areaBottom - areaTop) };
      const measure = () => {
        const rect = target!.getBoundingClientRect();
        return { left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 };
      };
      const size = { height: Math.max(panel.current?.offsetHeight ?? 0, (panel.current?.scrollHeight ?? 300) + 2) };
      const parents: HTMLElement[] = [];
      for (let parent = target.parentElement; parent && parent !== document.body && parent !== document.documentElement; parent = parent.parentElement) {
        if (parent.scrollHeight > parent.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(parent).overflowY)) parents.push(parent);
      }
      const maxScrollUp = () => parents.reduce((sum, parent) => sum + parent.scrollTop, window.scrollY);
      const scrollTarget = (amount: number) => {
        let remaining = amount;
        for (const scroller of [...parents, window]) {
          const before = measure().top;
          scroller.scrollBy({ top: remaining, behavior: 'instant' });
          remaining -= before - measure().top;
          if (Math.abs(remaining) <= 1) break;
        }
        return remaining;
      };
      let bounds = measure(), callout = tourCallout(bounds, size, area, maxScrollUp(), revealTarget);
      if (revealTarget) {
        revealTarget = false;
        // Nearest scrolling leaves already-visible controls and their surrounding lesson in place.
        if (bounds.left < area.left || bounds.left + bounds.width > area.left + area.width) {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          bounds = measure(); callout = tourCallout(bounds, size, area, maxScrollUp());
        }
        if (Math.abs(callout.scrollBy) > 1) {
          const remaining = scrollTarget(callout.scrollBy);
          if (remaining > 1) {
            // Add only the missing scroll room at the very end of a page, not a permanent empty screen.
            extraPadding += remaining + 12;
            (root as HTMLElement).style.paddingBottom = `${basePadding + extraPadding}px`;
            scrollTarget(remaining);
          }
          bounds = measure(); callout = tourCallout(bounds, size, area, maxScrollUp(), false);
        }
      }
      setPlacement(old => {
        const nextPlacement = { target: bounds, area, viewport: { width: window.innerWidth, height: window.innerHeight }, callout };
        return old && JSON.stringify(old) === JSON.stringify(nextPlacement) ? old : nextPlacement;
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(locate); };
    const viewportChanged = () => { revealTarget = true; schedule(); };
    const perform = (event: Event) => {
      if (!target || !(event.target instanceof Node) || !target.contains(event.target) || event.type !== step.event) return;
      if (step.allAnswers && candidates().some(empty)) { schedule(); return; }
      // React's own handlers retain control of navigation, saves and submission.
      if (index === guide.steps.length - 1) { setOpen(false); setFinished(true); }
      else setIndex(value => value + 1);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus({ preventScroll: true }); } };
    const resize = new ResizeObserver(viewportChanged);
    resize.observe(root); if (panel.current) resize.observe(panel.current);
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'open', 'style'] });
    root.addEventListener('click', perform); root.addEventListener('change', perform);
    window.addEventListener('scroll', schedule, true); window.addEventListener('resize', viewportChanged); window.addEventListener('keydown', escape);
    locate();
    return () => {
      active = false; cancelAnimationFrame(frame); clearTarget(); resize.disconnect(); mutation.disconnect();
      (root as HTMLElement).style.paddingBottom = originalPadding;
      root.removeEventListener('click', perform); root.removeEventListener('change', perform);
      window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', viewportChanged); window.removeEventListener('keydown', escape);
    };
  }, [open, index, step, guide.steps.length, id, animate]);

  return <section ref={host} className="ohm-guide" aria-label={guide.title}>
    <div className="ohm-guide-heading"><div><h3><MousePointer2 size={18} aria-hidden="true"/>{guide.title}</h3><p className="ohm-muted">{finished ? 'Walkthrough finished. Continue exploring on your own, or restart when you need help.' : 'Optional help for this page. Use the real controls; the next stage starts without a walkthrough.'}</p></div>
      <button type="button" ref={trigger} className="ohm-button ohm-secondary" aria-expanded={open} onClick={() => { if (open) end(); else { setIndex(0); setPlacement(null); setOpen(true); } }}>{open ? 'End walkthrough' : finished ? 'Restart walkthrough' : 'Guide me'}</button>
    </div>
    {open && createPortal(<div className="ohmward ohm-tour-layer">
      {placement && <><BubbleDimmer placement={placement} animate={animate}/><motion.div aria-hidden="true" className="ohm-tour-spotlight" initial={false} animate={placement.target} transition={{ duration: animate ? .2 : 0, ease: [.16, 1, .3, 1] }}/></>}
      <div ref={panel} className="ohm-tour-callout" role="region" aria-label="Guided walkthrough" data-side={placement?.callout.side} style={placement ? { left: placement.callout.left, top: placement.callout.top, width: placement.callout.width, maxHeight: placement.callout.maxHeight } : undefined}>
        <button type="button" className="ohm-tour-close" aria-label="End walkthrough" onClick={end}><X size={18} aria-hidden="true"/></button>
        <div id={`${id}-instruction`} role="status" aria-live="polite" aria-atomic="true"><p className="ohm-status">Step {index + 1} of {guide.steps.length}</p><h3>{step.title}</h3><p>{step.body}</p></div>
        <p className="ohm-tour-wait">{placement ? step.event === 'change' ? 'Change the outlined control to continue.' : 'Click the outlined control to continue.' : 'Waiting for this control to become available. You can end the walkthrough at any time.'}</p>
        <button type="button" className="ohm-button ohm-secondary" onClick={end}>End walkthrough</button>
      </div>
    </div>, document.body)}
  </section>;
}
