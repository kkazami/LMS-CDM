"use client";

import { useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

interface ResizeDividerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minBefore?: number;
  minAfter?: number;
  stacked?: boolean;
  resetValue?: number;
}

/** Resizes adjacent panes without letting either disappear. Arrow keys work too. */
export function ResizeDivider({ label, value, onChange, minBefore = 200, minAfter = 200,
  stacked = false, resetValue = 50 }: ResizeDividerProps) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ start: 0, value: 0, size: 1 });
  function limits(element: HTMLElement) {
    const before = element.previousElementSibling?.getBoundingClientRect();
    const after = element.nextElementSibling?.getBoundingClientRect();
    const size = stacked ? (before?.height || 0) + (after?.height || 0) : (before?.width || 0) + (after?.width || 0);
    return { size: Math.max(1, size), min: Math.min(45, minBefore / Math.max(1, size) * 100),
      max: 100 - Math.min(45, minAfter / Math.max(1, size) * 100) };
  }
  function change(element: HTMLElement, next: number) {
    const { min, max } = limits(element);
    onChange(Math.max(min, Math.min(max, next)));
  }
  return (
    <div role="separator" tabIndex={0} aria-label={label}
      aria-orientation={stacked ? 'horizontal' : 'vertical'} aria-valuenow={Math.round(value)}
      aria-valuemin={0} aria-valuemax={100}
      title="Drag to resize · arrow keys to adjust · double-click to reset"
      className={`group relative hidden shrink-0 touch-none items-center justify-center bg-slate-100 outline-none hover:bg-orange-100 focus-visible:bg-orange-100 dark:bg-[#1C2030] dark:hover:bg-orange-950 dark:focus-visible:bg-orange-950 md:flex ${stacked ? 'h-1.5 w-full cursor-row-resize' : 'h-full w-1.5 cursor-col-resize'}`}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { start: stacked ? event.clientY : event.clientX, value, size: limits(event.currentTarget).size };
        // Cover iframes before the next pointer event; shell clipping must not hide the shield.
        flushSync(() => setDragging(true));
      }}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const delta = (stacked ? event.clientY : event.clientX) - drag.current.start;
        change(event.currentTarget, drag.current.value + delta / drag.current.size * 100);
      }}
      onPointerUp={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onLostPointerCapture={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={event => change(event.currentTarget, resetValue)}
      onKeyDown={event => {
        const backward = stacked ? 'ArrowUp' : 'ArrowLeft';
        const forward = stacked ? 'ArrowDown' : 'ArrowRight';
        if (![backward, forward, 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const { min, max } = limits(event.currentTarget);
        change(event.currentTarget, event.key === 'Home' ? min : event.key === 'End' ? max : value + (event.key === backward ? -1 : 1) * (event.shiftKey ? 10 : 2));
      }}>
      <span aria-hidden="true" className={`rounded-full bg-slate-400/70 group-hover:bg-orange-500 group-focus-visible:bg-orange-500 dark:bg-slate-500 ${stacked ? 'h-0.5 w-6' : 'h-6 w-0.5'}`} />
      {dragging && createPortal(<div data-codelab-resize-shield aria-hidden="true" className={`fixed inset-0 z-[9999] select-none ${stacked ? 'cursor-row-resize' : 'cursor-col-resize'}`} />, document.body)}
    </div>
  );
}
