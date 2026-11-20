"use client";

import { useEffect, useRef, useState } from 'react';

/** CSS fullscreen also works in iOS/Android WebViews without the Fullscreen API. */
export function useEditorFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (data: string) => void } }).ReactNativeWebView;
    bridge?.postMessage(JSON.stringify({ type: 'FEATURE_EDITOR_FULLSCREEN', fullscreen: true }));
    const viewport = window.visualViewport;
    const resize = () => {
      root.current?.style.setProperty('--editor-height', `${viewport?.height ?? window.innerHeight}px`);
      root.current?.style.setProperty('--editor-top', `${viewport?.offsetTop ?? 0}px`);
    };
    const exit = () => setFullscreen(false);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); exit(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], textarea, input, select, [tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', keyboard);
    window.addEventListener('lms:exit-editor-fullscreen', exit);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('lms:exit-editor-fullscreen', exit);
      bridge?.postMessage(JSON.stringify({ type: 'FEATURE_EDITOR_FULLSCREEN', fullscreen: false }));
      trigger.current?.focus({ preventScroll: true });
    };
  }, [fullscreen]);
  return { fullscreen, setFullscreen, root, trigger };
}
