'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Button from '@/components/common/Button';
import { getInstituteTheme } from '@/lib/get-institute-theme';

const theme = getInstituteTheme('ics');
type Message = { title: string; description: string; label: string; confirm: boolean; afterClose?: () => void };

export function focusLabControl(id: string) {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    const tall = target.getBoundingClientRect().height > window.innerHeight * 0.7;
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: tall ? 'start' : 'center' });
    target.focus({ preventScroll: true });
  });
}

/** In-app confirmations and errors share the LMS focus trap and return focus on close. */
export function useLabDialogs() {
  const [message, setMessage] = useState<Message | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => {
    if (!message) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [Boolean(message)]);
  const finish = useCallback((accepted: boolean) => {
    pending.current?.(accepted); pending.current = null;
    setMessage(null);
  }, []);
  useEffect(() => () => { pending.current?.(false); }, []);
  const confirm = useCallback((title: string, description: string, label = 'Continue') => new Promise<boolean>(resolve => {
    pending.current?.(false); pending.current = resolve;
    setMessage({ title, description, label, confirm: true });
  }), []);
  const announce = useCallback((title: string, description: string, label = 'Got it', afterClose?: () => void) => {
    pending.current?.(false); pending.current = null;
    setMessage({ title, description, label, confirm: false, afterClose });
  }, []);
  const close = useCallback(() => { const next = message?.afterClose; finish(false); next?.(); }, [finish, message]);
  const dialog = message && typeof document !== 'undefined' ? createPortal(
    <div className="relative z-[120] [&_[role=dialog]]:max-h-[85dvh] [&_[role=dialog]]:overflow-y-auto [&_[id=confirm-dialog-description]]:whitespace-pre-line [&_[id=confirm-dialog-description]]:text-sm">
      <ConfirmDialog title={message.title} description={message.description} onClose={close}>
        <div className="flex flex-wrap justify-end gap-3">
          {message.confirm && <Button type="button" theme={theme} variant="secondary" onClick={close}>Cancel</Button>}
          <Button type="button" theme={theme} onClick={() => { const next = message.afterClose; finish(true); next?.(); }}>{message.label}</Button>
        </div>
      </ConfirmDialog>
    </div>, document.body) : null;
  return { confirm, announce, dialog };
}
