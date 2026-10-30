'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, Save, ShieldCheck } from 'lucide-react';
import Button from '@/components/common/Button';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { localDateTimeValue } from '@/lib/forms/availability';
import LabStepContent from './LabStepContent';
import { focusLabControl, useLabDialogs } from './LabDialogs';
import { scheduleProblem } from './authoring';
import { responseComplete, stepSchema } from '@/lib/labs/schema';
import { labRequest, labStatusLabel, type LabAssignment, type LabAttempt, type LabResponse, type LabSubmission } from './types';
import { readNativeDraft, writeNativeDraft, nativeDraftKey } from '@/lib/native-draft';
import { useNativeDraftOwner } from '@/hooks/useNativeDraftOwner';

const theme = getInstituteTheme('ics');
const input = 'w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm dark:border-slate-600 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100';
function answerText(answer: unknown): string {
  if (!answer || typeof answer !== 'object') return '';
  if ('text' in answer && typeof answer.text === 'string') return answer.text;
  if ('acknowledged' in answer) return answer.acknowledged ? 'Acknowledged' : 'Not acknowledged';
  if ('checkedIds' in answer && Array.isArray(answer.checkedIds)) return answer.checkedIds.length + ' checklist items completed';
  return '';
}
function Snapshot({ submission, attempt }: { submission: LabSubmission; attempt: LabAttempt }) {
  const snapshot = submission.snapshot;
  const responses = snapshot && typeof snapshot === 'object' && 'responses' in snapshot && Array.isArray(snapshot.responses) ? snapshot.responses as { stepId?: string; title?: string; answer?: unknown; evidenceIds?: string[] }[] : [];
  return <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">Submission {submission.round} · {new Date(submission.createdAt).toLocaleString()}</summary><div className="mt-4 space-y-4">{responses.map((response, index) => <div key={response.stepId ?? index}><h4 className="text-sm font-medium">{response.title ?? attempt.version.steps.find(s => s.id === response.stepId)?.title ?? 'Step ' + (index + 1)}</h4><p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{answerText(response.answer)}</p>{response.evidenceIds?.map(id => attempt.responses.flatMap(r => r.evidence).find(e => e.id === id)).filter(file => file !== undefined).map(file => <a key={file.id} href={'/api/labs/evidence/' + file.id} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-orange-700 underline">{file.fileName || 'View evidence'}</a>)}</div>)}</div></details>;
}

export default function LabRunner({ courseId, assignmentId, canReview, initialStudentId, initialAttemptId }: {
  courseId: string; assignmentId: string; canReview: boolean; initialStudentId?: string; initialAttemptId?: string;
}) {
  const { confirm, announce, dialog } = useLabDialogs();
  const base = '/api/courses/' + courseId + '/labs/' + assignmentId;
  const router = useRouter();
  const nativeOwner = useNativeDraftOwner();
  const recoveredOwner = useRef('');
  const [assignment, setAssignment] = useState<LabAssignment | null>(null);
  const [attempt, setAttempt] = useState<LabAttempt | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState(initialAttemptId ?? '');
  const [queuePage, setQueuePage] = useState(1);
  const [studentFilter, setStudentFilter] = useState(initialStudentId ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setErrorMessage] = useState('');
  const reportError = useCallback((message: string, target?: string) => {
    setErrorMessage(message);
    announce('Check this before continuing', message, target ? 'Show me where' : 'Got it', target ? () => focusLabControl(target) : undefined);
  }, [announce]);
  const [saveState, setSaveState] = useState('All changes saved');
  const [busy, setBusy] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [comment, setComment] = useState('');
  const [score, setScore] = useState('');
  const [reviewStep, setReviewStep] = useState('');
  const [decision, setDecision] = useState<'NEEDS_REVISION' | 'GRADED'>('NEEDS_REVISION');
  const [revisionDate, setRevisionDate] = useState('');
  const [replaceEvidence, setReplaceEvidence] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [assignmentStart, setAssignmentStart] = useState('');
  const pending = useRef(new Map<string, LabResponse['answer']>());
  const revisions = useRef(new Map<string, number>());
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = useRef(new Map<string, string>());
  const attemptRef = useRef<LabAttempt | null>(null);
  type Recovered = { stepId: string; answer: LabResponse['answer']; expectedRevision: number };
  const [draftConflicts, setDraftConflicts] = useState<Recovered[]>([]);
  const conflictsRef = useRef<Recovered[]>([]);
  const draftStorageError = useRef(false);
  const persistPending = () => {
    const current = attemptRef.current;
    if (!current || canReview) return;
    draftStorageError.current = !writeNativeDraft(`lab:${current.id}`, [...conflictsRef.current, ...[...pending.current].map(([stepId, answer]) => ({ stepId, answer, expectedRevision: revisions.current.get(stepId) ?? 0 }))]);
    if (draftStorageError.current) setSaveState('Device save failed · keep this screen open');
  };
  const loadGeneration = useRef(0);
  const applyAttempt = useCallback((value: LabAttempt) => {
    const changedAttempt = attemptRef.current?.id !== value.id || recoveredOwner.current !== nativeOwner;
    recoveredOwner.current = nativeOwner;
    if (changedAttempt) { setStepIndex(value.currentStep ?? 0); pending.current.clear(); revisions.current.clear(); }
    attemptRef.current = value; setAttempt(value);
    for (const response of value.responses) revisions.current.set(response.stepId, response.revision);
    if (changedAttempt && !canReview && nativeDraftKey(`lab:${value.id}`)) {
      const recovered = readNativeDraft<Array<{ stepId: string; answer: LabResponse['answer']; expectedRevision: number }>>(`lab:${value.id}`) ?? [];
      const conflicts: Recovered[] = [];
      for (const draft of recovered) {
        if (!value.version.steps.some(step => step.id === draft.stepId)) continue;
        const remote = value.responses.find(response => response.stepId === draft.stepId);
        if (JSON.stringify(remote?.answer) === JSON.stringify(draft.answer)) continue;
        if ((remote?.revision ?? 0) !== draft.expectedRevision) { conflicts.push(draft); continue; }
        pending.current.set(draft.stepId, draft.answer);
      }
      setDraftConflicts(conflicts);
      conflictsRef.current = conflicts;
      if (pending.current.size) {
        setAttempt({ ...value, responses: value.version.steps.map(step => {
          const remote = value.responses.find(response => response.stepId === step.id);
          return { ...(remote ?? { stepId: step.id, revision: 0, evidence: [] }), answer: (step.id ? pending.current.get(step.id) : undefined) ?? remote?.answer };
        }) as LabResponse[] });
        setSaveState('Recovered edits on this device · tap Save to sync');
      }
    }
  }, [canReview, nativeOwner]);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const query = canReview ? '?page=' + queuePage + (studentFilter ? '&studentId=' + encodeURIComponent(studentFilter) : '') : '';
    const value = await labRequest<LabAssignment>(base + query);
    if (generation !== loadGeneration.current) return;
    setAssignment(value); setAssignmentStart(localDateTimeValue(value.opensAt)); setAssignmentDue(localDateTimeValue(value.syllabusItem.dueDate));
    if (!canReview || selectedAttempt) {
      const loaded = await labRequest<LabAttempt>(!canReview ? base + '/attempts' : base + '/attempts/' + selectedAttempt, !canReview ? { method: 'POST', body: '{}' } : undefined);
      if (generation === loadGeneration.current) applyAttempt(loaded);
    }
    else if (studentFilter) { const found = value.attempts?.find(a => a.student.id === studentFilter); if (found) setSelectedAttempt(found.id); }
  }, [base, canReview, selectedAttempt, studentFilter, queuePage, applyAttempt]);
  useEffect(() => { void load().catch(e => reportError(e instanceof Error ? e.message : 'Unable to load this lab.')).finally(() => setLoading(false)); }, [load, reportError]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (pending.current.size || saving.current || draftStorageError.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  function drain(): Promise<void> {
    if (saving.current) return saving.current;
    const work = async () => {
      setSaveState('Saving…');
      while (pending.current.size) {
        const current = attemptRef.current; if (!current) throw new Error('Reload the lab before saving.');
        const [stepId, answer] = pending.current.entries().next().value!;
        const saved = await labRequest<LabResponse>(base + '/attempts/' + current.id + '/responses/' + stepId, { method: 'PATCH', body: JSON.stringify({ answer, expectedRevision: revisions.current.get(stepId) ?? 0 }) });
        revisions.current.set(stepId, saved.revision);
        if (pending.current.get(stepId) === answer) pending.current.delete(stepId);
        persistPending();
        setAttempt(previous => previous ? { ...previous, responses: [...previous.responses.filter(r => r.stepId !== stepId), { ...saved, answer: pending.current.get(stepId) ?? saved.answer }] } : previous);
      }
      setSaveState('All changes saved');
    };
    saving.current = work().catch(e => { setSaveState('Save failed · your edits are still here'); reportError(e instanceof Error ? e.message : 'Save failed.'); throw e; }).finally(() => { saving.current = null; });
    return saving.current;
  }
  function change(stepId: string, answer: LabResponse['answer']) {
    pending.current.set(stepId, answer); setSaveState('Unsaved changes');
    persistPending();
    setAttempt(previous => previous ? { ...previous, responses: [...previous.responses.filter(r => r.stepId !== stepId), { ...(previous.responses.find(r => r.stepId === stepId) ?? { stepId, revision: 0, evidence: [] }), answer }] } : previous);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void drain().catch(() => {}); }, 700);
  }
  async function action(work: () => Promise<void>) {
    setBusy(true); setErrorMessage('');
    try { if (draftConflicts.length) throw new Error('Review the recovered draft conflicts before submitting.'); if (timer.current) clearTimeout(timer.current); await drain(); await work(); }
    catch (e) { reportError(e instanceof Error ? e.message : 'The request failed.'); }
    finally { setBusy(false); }
  }
  async function mutate(kind: string, payload: Record<string, unknown>) {
    if (!attempt) return;
    if (canReview && attempt.id !== selectedAttempt) throw new Error('Wait for the selected student work to finish loading.');
    const signature = JSON.stringify([attempt.id, attempt.submissions.length, kind, payload]);
    let key = keys.current.get(signature); if (!key) { key = crypto.randomUUID(); keys.current.set(signature, key); }
    await labRequest(base + '/attempts/' + attempt.id + '/' + kind, { method: 'POST', body: JSON.stringify({ ...payload, idempotencyKey: key }) });
    pending.current.clear(); await load(); setComment(''); setScore(''); setRevisionDate(''); router.refresh();
  }
  async function submitWork() {
    await action(async () => {
      if (!attempt) return;
      const missing = attempt.version.steps.findIndex(s => {
        if (!s.required) return false;
        const checked = stepSchema.safeParse({ key: s.key, type: s.type, title: s.title, required: s.required, config: s.config });
        const answer = attempt.responses.find(r => r.stepId === s.id);
        return !checked.success || !responseComplete(checked.data, answer?.answer, answer?.evidence.filter(e => !e.supersededAt).length ?? 0);
      });
      if (missing >= 0) {
        setStepIndex(missing);
        announce('Complete the required steps', 'Finish step ' + (missing + 1) + ': ' + attempt.version.steps[missing].title + ' before submitting.', 'Go to required step', () => focusLabControl('lab-active-step'));
        return;
      }
      if (await confirm('Submit this work for review?', 'You can edit again only if your instructor requests a correction. Make sure every required step and evidence file is complete.', 'Submit for review')) await mutate('submit', {});
    });
  }
  const due = attempt?.status === 'NEEDS_REVISION' ? attempt.revisionDueAt : assignment?.syllabusItem.dueDate;
  const expired = due ? new Date(due).getTime() <= Date.now() : false;
  const writable = !canReview && attempt && ['IN_PROGRESS', 'NEEDS_REVISION'].includes(attempt.status) && !expired && assignment?.status !== 'ARCHIVED' && !assignment?.archivedAt;
  const step = attempt?.version.steps[stepIndex];
  const response = step ? attempt?.responses.find(r => r.stepId === step.id) : undefined;
  const activeEvidence = response?.evidence.filter(e => !e.supersededAt) ?? [];
  const completeCount = attempt?.responses.filter(r => r.completed).length ?? 0;
  return <div data-practical-lab className="mx-auto min-w-0 max-w-6xl space-y-6 pb-12 [overflow-wrap:anywhere] [&_input]:min-w-0 [&_textarea]:min-w-0 [&_select]:min-w-0">
    {draftConflicts.map(draft => <section key={draft.stepId} role="alert" className="rounded-xl border border-amber-300 p-4 text-sm dark:text-slate-200"><h2 className="font-semibold">A newer answer was saved elsewhere</h2><p className="mt-2">Review your recovered device copy before choosing which answer to keep.</p><pre className="my-3 whitespace-pre-wrap break-words">{answerText(draft.answer) || JSON.stringify(draft.answer)}</pre><div className="flex flex-wrap gap-3"><Button theme={theme} onClick={() => {
      conflictsRef.current = conflictsRef.current.filter(value => value.stepId !== draft.stepId); setDraftConflicts(conflictsRef.current); persistPending();
    }}>Keep server answer</Button><Button theme={theme} variant="secondary" onClick={() => {
      conflictsRef.current = conflictsRef.current.filter(value => value.stepId !== draft.stepId); setDraftConflicts(conflictsRef.current); change(draft.stepId, draft.answer);
    }}>Use recovered answer</Button></div></section>)}
    <Link href={'/ics/courses/' + courseId + '/classwork'} onClick={e => { if (pending.current.size || saving.current) { e.preventDefault(); void action(async () => { window.location.assign('/ics/courses/' + courseId + '/classwork'); }); } }} className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} />Back to Classwork</Link>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<p className="mt-2">If another tab changed this work, copy your unsaved answer before reloading.</p></div>}
    {loading && <p role="status">Loading practical lab…</p>}
    {assignment && <header className="border-b border-slate-200 pb-6 dark:border-slate-700"><p className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-300">{assignment.syllabusItem.type.replaceAll('_', ' ')} · Guided practical lab</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{assignment.syllabusItem.title}</h1><div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500"><span>{assignment.syllabusItem.maxPoints} points</span><span>{assignment.version.estimatedMinutes} minutes</span>{due && <span>{attempt?.status === 'NEEDS_REVISION' ? 'Correction due' : 'Due'} {new Date(due).toLocaleString()}</span>}{attempt && <span className="font-medium text-orange-700 dark:text-orange-300">{labStatusLabel[attempt.status] ?? attempt.status}</span>}</div><p className="mt-3 text-xs leading-6 text-slate-500">Complete commands in your approved environment. This practical task does not lock or monitor your computer.</p></header>}
    {assignment && <details open className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <summary className="min-h-10 cursor-pointer font-semibold">Before you start: goal, tools, and prerequisites</summary>
      <dl className="mt-3 space-y-4 text-sm leading-7">
        <div><dt className="font-medium">Goal</dt><dd className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{assignment.version.objective}</dd></div>
        {assignment.version.prerequisites && <div><dt className="font-medium">Before you begin</dt><dd className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{assignment.version.prerequisites}</dd></div>}
        {assignment.version.requiredTools && <div><dt className="font-medium">Tools</dt><dd className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{assignment.version.requiredTools}</dd></div>}
      </dl>
    </details>}
    {canReview && assignment?.status === 'DRAFT' && <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-orange-950"><div><h2 className="font-semibold">4. Publish the classwork</h2><p className="mt-1 text-sm">Students will see this lab after you publish it.</p></div><Button theme={theme} loading={busy} id="lab-publish-classwork" className="ring-2 ring-orange-500 ring-offset-4 dark:ring-offset-slate-900" onClick={async () => { if (await confirm('Publish this practical lab?', 'Eligible students will find it in Classwork when the start date arrives. They will follow the published instructions and submit their evidence.', 'Publish classwork')) void action(async () => { await labRequest(base, { method: 'PATCH', body: JSON.stringify({ published: true }) }); await load(); router.refresh(); announce('Classwork published', 'Your practical lab is ready. Eligible students can begin when its start date arrives.'); }); }}>Publish classwork</Button></section>}
    {canReview && assignment && <section className="space-y-4" aria-label="Instructor review queue"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Student work</h2><Link className="text-sm text-orange-700 underline" href={'/ics/courses/' + courseId + '/gradebook'}>Open gradebook</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assignment.attempts?.map(a => <button key={a.id} type="button" disabled={busy} onClick={() => { loadGeneration.current++; setAttempt(null); attemptRef.current = null; setSelectedAttempt(a.id); setStepIndex(0); setComment(''); }} className={'rounded-xl border p-4 text-left ' + (a.id === selectedAttempt ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : 'border-slate-200 dark:border-slate-700')}><span className="block text-sm font-medium">{a.student.name}</span><span className="mt-1 block text-xs text-slate-500">{labStatusLabel[a.status] ?? a.status}{a.score !== null ? ' · ' + a.score + ' points' : ''}</span></button>)}</div>{!assignment.attempts?.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No student has started this lab.</p>}
      {(studentFilter || (assignment.attemptPagination?.totalPages ?? 1) > 1) && <div className="flex flex-wrap items-center gap-3 text-sm">{studentFilter ? <Button theme={theme} variant="secondary" disabled={busy} onClick={() => { loadGeneration.current++; setAttempt(null); attemptRef.current = null; setSelectedAttempt(''); setStudentFilter(''); setQueuePage(1); }}>Show all students</Button> : <><Button theme={theme} variant="secondary" disabled={busy || queuePage <= 1} onClick={() => { loadGeneration.current++; setAttempt(null); attemptRef.current = null; setSelectedAttempt(''); setQueuePage(queuePage - 1); }}>Previous page</Button><span>Page {queuePage} of {assignment.attemptPagination?.totalPages} · {assignment.attemptPagination?.total} students</span><Button theme={theme} variant="secondary" disabled={busy || queuePage >= (assignment.attemptPagination?.totalPages ?? 1)} onClick={() => { loadGeneration.current++; setAttempt(null); attemptRef.current = null; setSelectedAttempt(''); setQueuePage(queuePage + 1); }}>Next page</Button></>}</div>}
      <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">Assignment settings</summary><div className="mt-4 flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm">Start date<input id="lab-assigned-start" readOnly={(assignment?.attemptPagination?.total ?? 0) > 0} className={input} type="datetime-local" value={assignmentStart} onChange={e => setAssignmentStart(e.target.value)} /></label><label className="space-y-1 text-sm">Due date<input id="lab-assigned-due" className={input} type="datetime-local" value={assignmentDue} onChange={e => setAssignmentDue(e.target.value)} /></label><Button theme={theme} disabled={busy} variant="secondary" onClick={() => { const problem = scheduleProblem(assignmentStart, assignmentDue); if (problem) { reportError(problem, 'lab-assigned-due'); return; } void action(async () => { await labRequest(base, { method: 'PATCH', body: JSON.stringify({ ...(assignmentStart !== localDateTimeValue(assignment?.opensAt) ? { opensAt: assignmentStart ? new Date(assignmentStart).toISOString() : null } : {}), dueDate: assignmentDue ? new Date(assignmentDue).toISOString() : null }) }); await load(); }); }}>Save schedule</Button><Button theme={theme} disabled={busy} variant="secondary" onClick={async () => { const archived = assignment.status !== 'ARCHIVED' && !assignment.archivedAt; if (await confirm(archived ? 'Archive this lab?' : 'Unarchive this lab?', archived ? 'Student work and history stay available, but changes will be blocked.' : 'Students and instructors can continue working within the existing deadlines.', archived ? 'Archive lab' : 'Unarchive lab')) void action(async () => { await labRequest(base, { method: 'PATCH', body: JSON.stringify({ archived }) }); await load(); }); }}>{assignment.status === 'ARCHIVED' || assignment.archivedAt ? 'Unarchive lab' : 'Archive lab'}</Button></div></details>
    </section>}
    {attempt && <>
      {!attempt.submissions.length && attempt.status === 'GRADED' && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">Your instructor recorded a grade without a lab submission. No student work has been marked as submitted. See the reason below.</p>}
      {!attempt.submissions.length && attempt.status === 'NEEDS_REVISION' && <p role="status" className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm dark:border-orange-800 dark:bg-orange-950">Your instructor allowed a late submission. Complete the steps and submit before the new deadline.</p>}

      <section className="grid gap-4 rounded-xl bg-slate-50 p-5 text-sm dark:bg-slate-800/50 sm:grid-cols-3"><div><h2 className="font-semibold">Objective</h2><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-500">{attempt.version.objective}</p></div><div><h2 className="font-semibold">Before you start</h2><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-500">{attempt.version.prerequisites || 'No additional prerequisites.'}</p></div><div><h2 className="font-semibold">Tools</h2><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-500">{attempt.version.requiredTools}</p>{attempt.evidenceToken && <p className="mt-3">Your evidence label: <code className="rounded bg-orange-100 px-2 py-1 text-orange-900">{attempt.evidenceToken}</code></p>}</div></section>
      {expired && ['IN_PROGRESS', 'NEEDS_REVISION'].includes(attempt.status) && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">The deadline has passed. Your work is preserved. Ask your instructor to extend the deadline or reopen corrections.</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <label className="block space-y-2 text-sm font-medium lg:hidden">
          Lab step · {completeCount} of {attempt.version.steps.length} completed
          <select aria-label="Choose lab step" className={input + ' mt-2 min-h-12'} value={stepIndex} disabled={busy}
            onChange={e => { const index = Number(e.target.value); void action(async () => { setStepIndex(index); setReplaceEvidence(''); }); }}>
            {attempt.version.steps.map((s, index) => <option key={s.id ?? s.key} value={index}>{index + 1}. {s.title}{attempt.responses.find(r => r.stepId === s.id)?.completed ? ' · Completed' : s.required ? ' · Required' : ''}</option>)}
          </select>
        </label>
        <nav aria-label="Lab steps" className="hidden lg:block rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{completeCount} of {attempt.version.steps.length} steps completed</p><ol className="space-y-1">{attempt.version.steps.map((s, index) => <li key={s.id ?? s.key}><button type="button" aria-current={index === stepIndex ? 'step' : undefined} onClick={() => void action(async () => { setStepIndex(index); setReplaceEvidence(''); })} disabled={busy} className={'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm ' + (index === stepIndex ? 'bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}><span className="mt-0.5 shrink-0">{attempt.responses.find(r => r.stepId === s.id)?.completed ? <CheckCircle2 size={16} /> : index + 1}</span><span>{s.title}<span className="mt-1 block text-xs opacity-60">{s.required ? 'Required' : 'Optional'}</span></span></button></li>)}</ol></nav>
        {step && <section id="lab-active-step" tabIndex={-1} className="scroll-mt-28 min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900"><div><p className="text-xs text-slate-500">Step {stepIndex + 1}</p><h2 className="mt-1 text-xl font-semibold">{step.title}</h2></div><LabStepContent step={step} response={response} disabled={!writable || busy} onChange={answer => change(step.id!, answer)} />
          {step.type === 'EVIDENCE_UPLOAD' && <div className="space-y-4">{activeEvidence.map(file => <a key={file.id} href={'/api/labs/evidence/' + file.id} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 p-4 text-sm text-orange-700 underline dark:border-slate-700">{file.fileName} · {(file.size / 1024).toFixed(0)} KB</a>)}{writable && <><label className="block space-y-2 text-sm">Replace existing evidence, or add a file<select className={input} value={replaceEvidence} onChange={e => setReplaceEvidence(e.target.value)}><option value="">Add a new file</option>{activeEvidence.map(file => <option key={file.id} value={file.id}>Replace {file.fileName}</option>)}</select></label><label className="block rounded-xl border border-dashed border-slate-300 p-5 text-sm"><span className="mb-3 flex items-center gap-2 font-medium"><FileUp size={18} />{busy ? 'Uploading and scanning…' : 'Choose evidence'}</span><input type="file" aria-label="Upload lab evidence" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" disabled={busy || activeEvidence.length >= (step.config.maxFiles ?? 3) && !replaceEvidence} onChange={e => {
              const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
              if (file.size > 3 * 1024 * 1024) { reportError('Choose a file no larger than 3 MiB.'); return; }
              void action(async () => { const body = new FormData(); body.set('file', file); body.set('expectedRevision', String(revisions.current.get(step.id!) ?? 0)); if (replaceEvidence) body.set('replaceEvidenceId', replaceEvidence); const saved = await labRequest<LabResponse>(base + '/attempts/' + attempt.id + '/responses/' + step.id + '/evidence', { method: 'POST', body }); revisions.current.set(step.id!, saved.revision); setAttempt(previous => previous ? { ...previous, responses: [...previous.responses.filter(r => r.stepId !== step.id), saved] } : previous); setReplaceEvidence(''); });
            }} /><span className="mt-3 block text-xs text-slate-500">PNG, JPEG, WebP, PDF or TXT · up to 3 MiB each. Submitted evidence is kept in history when replaced.</span></label>{busy && <progress aria-label="Uploading and scanning evidence" className="w-full" />}</>}</div>}
          {!canReview && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800"><p role="status" className="text-xs text-slate-500">{saveState}</p>{writable && <Button theme={theme} variant="secondary" disabled={busy} onClick={() => void action(async () => {})}><Save size={15} className="mr-2" />Save now</Button>}</div>}
          <div className="flex justify-between gap-3"><Button theme={theme} variant="ghost" disabled={busy || stepIndex === 0} onClick={() => void action(async () => setStepIndex(stepIndex - 1))}><ArrowLeft size={16} className="mr-2" />Previous</Button>{stepIndex < attempt.version.steps.length - 1 ? <Button theme={theme} variant="secondary" disabled={busy} onClick={() => void action(async () => setStepIndex(stepIndex + 1))}>Next<ArrowRight size={16} className="ml-2" /></Button> : writable && <Button theme={theme} loading={busy} onClick={() => void submitWork()}>{attempt.status === 'NEEDS_REVISION' && attempt.submissions.length ? 'Resubmit for review' : 'Submit for review'}</Button>}</div>
        </section>}
      </div>
      {canReview && <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={20} />Instructor decision · {attempt.student?.name}</h2><p className="mt-2 text-sm text-slate-500">Review the submitted round and evidence before returning a decision.</p>{attempt.status === 'SUBMITTED' ? <form noValidate className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (!comment.trim()) { reportError('Write feedback before returning a decision.', 'lab-review-feedback'); return; } if (decision === 'GRADED' && (!score.trim() || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > (assignment?.syllabusItem.maxPoints ?? 100000))) { reportError('Enter awarded points from zero to the maximum for this classwork.', 'lab-review-score'); return; } if (revisionDate && new Date(revisionDate).getTime() <= Date.now()) { reportError('Choose a future correction deadline.', 'lab-revision-date'); return; } void action(() => mutate('review', { decision, comment, ...(decision === 'GRADED' ? { score: Number(score) } : revisionDate ? { revisionDueAt: new Date(revisionDate).toISOString() } : {}), ...(reviewStep ? { stepId: reviewStep } : {}) })); }}><label className="space-y-1 text-sm">Decision<select className={input} value={decision} onChange={e => setDecision(e.target.value as typeof decision)}><option value="NEEDS_REVISION">Request correction</option><option value="GRADED">Grade and return</option></select></label>{decision === 'GRADED' ? <label className="space-y-1 text-sm">Awarded points<input id="lab-review-score" className={input} required type="number" min={0} step="0.01" max={assignment?.syllabusItem.maxPoints ?? 100000} value={score} onChange={e => setScore(e.target.value)} /></label> : <label className="space-y-1 text-sm">Correction deadline · defaults to seven days<input id="lab-revision-date" className={input} type="datetime-local" value={revisionDate} onChange={e => setRevisionDate(e.target.value)} /></label>}<label className="space-y-1 text-sm sm:col-span-2">Feedback<textarea id="lab-review-feedback" className={input} required rows={4} maxLength={10000} value={comment} onChange={e => setComment(e.target.value)} /></label><label className="space-y-1 text-sm">Feedback applies to<select className={input} value={reviewStep} onChange={e => setReviewStep(e.target.value)}><option value="">Whole lab</option>{attempt.version.steps.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label><div className="flex items-end"><Button theme={theme} type="submit" loading={busy}>Return decision</Button></div></form> : attempt.status === 'NEEDS_REVISION' ? <form noValidate className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); if (!comment.trim()) { reportError('Explain why the correction window is being reopened.', 'lab-reopen-reason'); return; } if (!revisionDate || new Date(revisionDate).getTime() <= Date.now()) { reportError('Choose a future correction deadline.', 'lab-reopen-date'); return; } void action(() => mutate('reopen', { comment, revisionDueAt: new Date(revisionDate).toISOString() })); }}><label className="space-y-1 text-sm">New correction deadline<input id="lab-reopen-date" className={input} required type="datetime-local" value={revisionDate} onChange={e => setRevisionDate(e.target.value)} /></label><label className="space-y-1 text-sm">Reason for reopening<input id="lab-reopen-reason" className={input} required maxLength={10000} value={comment} onChange={e => setComment(e.target.value)} /></label><Button theme={theme} type="submit" loading={busy}>Reopen correction window</Button></form> : <p className="mt-4 text-sm text-slate-500">{attempt.status === 'GRADED' ? 'Returned grade: ' + attempt.score + ' / ' + assignment?.syllabusItem.maxPoints : 'The student has not submitted this attempt yet.'}</p>}</section>}
      <section className="space-y-4" aria-labelledby="feedback-history"><h2 id="feedback-history" className="text-lg font-semibold">Feedback and submission history</h2>{attempt.status === 'GRADED' && !canReview && <p className="text-xl font-semibold">{attempt.score} / {assignment?.syllabusItem.maxPoints} points</p>}{attempt.reviews.map(review => <article key={review.id} className="rounded-xl border-l-4 border-orange-400 bg-orange-50 p-5 dark:bg-orange-950/40"><p className="text-xs font-medium text-orange-800 dark:text-orange-200">{labStatusLabel[review.decision] ?? review.decision} · {new Date(review.createdAt).toLocaleString()}</p>{review.stepId && <p className="mt-2 text-xs font-medium">{attempt.version.steps.find(s => s.id === review.stepId)?.title}</p>}<p className="mt-3 whitespace-pre-wrap text-sm leading-7">{review.comment}</p></article>)}{attempt.submissions.map(s => <Snapshot key={s.id} submission={s} attempt={attempt} />)}{!attempt.submissions.length && !attempt.reviews.length && <p className="text-sm text-slate-500">Submitted rounds and instructor feedback will appear here.</p>}</section>
    </>}
    {dialog}
    {attempt && Boolean(attempt.gradebookHistory?.length) && <section className="space-y-3"><h2 className="text-lg font-semibold">Gradebook decisions</h2>{attempt.gradebookHistory!.map(event => <article key={event.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-sm font-semibold">{event.action === 'LAB_GRADEBOOK_GRADE' ? `Grade recorded: ${event.score}/${attempt.assignment.syllabusItem.maxPoints}` : 'Late submission allowed'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{event.reason}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{event.instructor} · {new Date(event.createdAt).toLocaleString()}{event.revisionDueAt ? ` · Deadline: ${new Date(event.revisionDueAt).toLocaleString()}` : ''}</p></article>)}</section>}
  </div>;
}
