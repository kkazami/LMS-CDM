'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Button from '@/components/common/Button';
import type { InstituteTheme } from '@/lib/theme';

export default function DeleteClassworkDialog({ title, theme, onDelete, onDeleted, onClose }: {
  title: string;
  theme: InstituteTheme;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  function close() { if (!inFlight.current) onClose(); }
  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true; setDeleting(true); setError('');
    try { await onDelete(); onDeleted(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Classwork could not be deleted. Please try again.'); }
    finally { inFlight.current = false; setDeleting(false); }
  }
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="relative z-[120] [&_[role=dialog]]:max-h-[85dvh] [&_[role=dialog]]:overflow-y-auto [&_[id=confirm-dialog-description]]:text-sm [&_[id=confirm-dialog-description]]:leading-6">
    <ConfirmDialog title="Delete classwork?" description={`“${title}” and its associated submissions and grades will be permanently deleted. This cannot be undone.`} onClose={close}>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" theme={theme} variant="secondary" disabled={deleting} onClick={close}>Cancel</Button>
        <button type="button" disabled={deleting} aria-busy={deleting} onClick={() => void remove()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-60">
          {deleting ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}{deleting ? 'Deleting…' : 'Delete classwork'}
        </button>
      </div>
    </ConfirmDialog>
  </div>, document.body);
}
