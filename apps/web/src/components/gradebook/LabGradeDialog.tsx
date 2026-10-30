'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { localDateTimeValue } from '@/lib/forms/availability';
import { labRequest } from '@/components/labs/types';
import type { GradebookAssignment, GradebookCell, GradebookStudent } from '@/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions';

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]';
export interface LabGradeResult { attemptId: string; submissionId: string; revision: number; status: string; score: number | null; submittedAt: string | null; revisionDueAt: string | null }
export default function LabGradeDialog({ courseId, item, student, cell, onClose, onSaved }: {
  courseId: string; item: GradebookAssignment; student: GradebookStudent; cell?: GradebookCell;
  onClose: () => void; onSaved: (result: LabGradeResult) => void;
}) {
  const panel = useRef<HTMLDialogElement>(null), heading = useId();
  const [action, setAction] = useState<'GRADE' | 'REOPEN'>('GRADE');
  const [score, setScore] = useState(cell?.grade?.toString() ?? '');
  const [reason, setReason] = useState('');
  const [due, setDue] = useState(() => localDateTimeValue(new Date(Date.now() + 7 * 86400000)));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const busyRef = useRef(false), receipt = useRef({ signature: '', key: '' });
  useEffect(() => { const node = panel.current!; node.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { node.close(); document.body.style.overflow = overflow; }; }, []);
  async function save() {
    if (busyRef.current) return;
    setError('');
    if (!reason.trim()) { setError('Add a reason so the student understands this decision.'); return; }
    if (action === 'GRADE' && (!score.trim() || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > (item.maxPoints ?? 0))) { setError(`Enter points from 0 to ${item.maxPoints}.`); return; }
    if (action === 'REOPEN' && (!due || new Date(due).getTime() <= Date.now())) { setError('Choose a future deadline for the late submission.'); return; }
    const payload = { action, studentId: student.id, expectedRevision: cell?.labRevision ?? null, reason: reason.trim(), ...(action === 'GRADE' ? { score: Number(score) } : { revisionDueAt: new Date(due).toISOString() }) };
    const signature = JSON.stringify(payload);
    if (receipt.current.signature !== signature) receipt.current = { signature, key: crypto.randomUUID() };
    busyRef.current = true; setBusy(true);
    try {
      const result = await labRequest<LabGradeResult>(`/api/courses/${courseId}/labs/${item.labAssignmentId}/gradebook`, { method: 'POST', body: JSON.stringify({ ...payload, idempotencyKey: receipt.current.key }) });
      onSaved(result);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'The decision could not be saved. Retry with the same details.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <dialog ref={panel} aria-labelledby={heading} onCancel={event => { event.preventDefault(); if (!busyRef.current) onClose(); }} className="m-auto max-h-[90dvh] w-[92vw] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-black/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <h2 id={heading} className="text-xl font-semibold">Practical-lab grade</h2>
    <p className="mt-2 text-sm">{student.name} · {item.title}</p>
    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{cell?.submittedAt ? 'Student work and earlier reviews remain in the practical lab.' : 'No lab submission received. You can record a score, including zero, without marking work as submitted.'}</p>
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <label className="grid gap-2 text-sm">Decision<select className={field} value={action} onChange={event => setAction(event.target.value as typeof action)}><option value="GRADE">Record a grade</option><option value="REOPEN">Allow late submission</option></select></label>
        {action === 'GRADE' ? <label className="grid gap-2 text-sm">Awarded points (out of {item.maxPoints})<input autoFocus className={field} type="number" min={0} max={item.maxPoints ?? 0} step="0.01" value={score} onChange={event => setScore(event.target.value)}/></label> : <><label className="grid gap-2 text-sm">Late-submission deadline<input className={field} type="datetime-local" value={due} onChange={event => setDue(event.target.value)}/></label><p className="text-sm text-slate-600 dark:text-slate-300">Times use your device timezone. This allows editing and submission until the new deadline. It clears the current grade, while preserving previous grades, responses, evidence, and reviews.</p></>}
        <label className="grid gap-2 text-sm">Reason for the student<textarea className={field} required maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: Missed the practical lab without a submission."/></label>
      </fieldset>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</div>}
      <footer className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-600">{error ? 'Close and refresh' : 'Cancel'}</button><button disabled={busy} className="rounded-xl bg-orange-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : action === 'GRADE' ? 'Save lab grade' : 'Allow late submission'}</button></footer>
    </form>
  </dialog>;
}
