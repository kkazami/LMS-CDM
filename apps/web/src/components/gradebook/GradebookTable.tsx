'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, Settings, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { upsertGrade, clearGrade, saveGradebookPeriodPolicy, assignGradebookPeriods, type GradebookData, type GradebookCell } from '@/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions';
import GradeEvaluationModal from '@/components/courses/GradeEvaluationModal';
import { calculatePeriodGrades, type ItemPeriod, type PeriodResult } from '@/lib/grading/periods';
import { percentToGradePoint, formatGradePoint, isPassing } from '@/lib/grading/ph-scale';
import type { InstituteTheme } from '@/lib/theme';
import { PeriodAssignmentDialog, PeriodPolicyDialog, periodLabel } from './GradebookDialogs';

export function getGradingScaleEquivalent(percentage: number) { return formatGradePoint(percentToGradePoint(percentage)); }
type Tab = ItemPeriod | 'SUMMARY';
type Cell = { studentId: string; assignmentId: string };
type Props = { data: GradebookData; courseId: string; courseTitle: string; instituteCode: string; theme?: InstituteTheme; standalone?: boolean; initialPeriod?: string };
const field = 'w-24 rounded-lg border border-orange-500 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 dark:bg-slate-800 dark:text-slate-100';
const control = 'inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';

function Total({ value, result }: { value: number | null; result?: PeriodResult }) {
  if (value == null) return <span className="text-sm text-slate-500 dark:text-slate-400" title={result?.reason ?? 'Assign all classwork and complete both weighted periods.'}>Pending{result ? <span className="mt-1 block text-xs">{result.graded}/{result.total} graded</span> : null}</span>;
  const gradePoint = percentToGradePoint(value);
  return <span className="inline-flex flex-col items-end"><strong className={'font-mono text-lg ' + (isPassing(gradePoint) ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>{formatGradePoint(gradePoint)}</strong><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{value.toFixed(2)}%</span></span>;
}

export default function GradebookTable({ data, courseId, courseTitle, instituteCode, standalone = false, initialPeriod }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(['MIDTERM', 'FINALS', 'SUMMARY', 'UNASSIGNED'].includes(initialPeriod ?? '') ? initialPeriod as Tab : 'MIDTERM');
  const [cells, setCells] = useState(data.grades);
  const [editing, setEditing] = useState<Cell | null>(null), [draft, setDraft] = useState('');
  const [dialog, setDialog] = useState<'POLICY' | 'PERIODS' | null>(null);
  const [status, setStatus] = useState('Scores are saved automatically when you leave a cell.');
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => { const changed = () => setExpanded(document.fullscreenElement === container.current); document.addEventListener('fullscreenchange', changed); return () => document.removeEventListener('fullscreenchange', changed); }, []);
  async function toggleExpanded() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen(); } catch { setError('Your browser could not open full screen. You can still use the wide Gradebooks workspace.'); } }
  const [review, setReview] = useState<{ studentId: string; itemId: string } | null>(null);
  const visible = tab === 'SUMMARY' ? [] : data.assignments.filter(item => item.gradingPeriod === tab);
  const unassigned = data.assignments.filter(item => item.gradingPeriod === 'UNASSIGNED').length;
  const totals = Object.fromEntries(data.students.map(student => [student.id, calculatePeriodGrades(data.assignments, id => cells[student.id]?.[id]?.grade, data.periodPolicy, data.gradingPolicy?.weights)]));
  const reviewItem = data.assignments.find(item => item.id === review?.itemId);
  const reviewStudent = data.students.find(student => student.id === review?.studentId);
  const reviewCell = review && cells[review.studentId]?.[review.itemId];
  const base = `/${instituteCode}/courses/${courseId}`;
  function changeTab(next: Tab) {
    if (savingRef.current || editing) return;
    setTab(next);
    const url = new URL(window.location.href); url.searchParams.set('period', next); window.history.replaceState(null, '', url);
  }
  function beginEdit(cell: Cell) {
    if (savingRef.current || window.matchMedia('(max-width: 767px)').matches) return;
    setError(''); setDraft(cells[cell.studentId]?.[cell.assignmentId]?.grade?.toString() ?? ''); setEditing(cell);
  }
  function focusCell(studentId: string, assignmentId: string) {
    const node = document.getElementById(`grade-cell-${studentId}-${assignmentId}`);
    node?.focus(); node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function advance(cell: Cell, move: number) {
    const index = data.students.findIndex(student => student.id === cell.studentId) + move;
    const next = data.students[index];
    if (next) { setEditing({ studentId: next.id, assignmentId: cell.assignmentId }); setDraft(cells[next.id]?.[cell.assignmentId]?.grade?.toString() ?? ''); }
  }
  async function save(cell: Cell, move?: number) {
    if (savingRef.current) return;
    const item = data.assignments.find(item => item.id === cell.assignmentId)!;
    const grade = draft.trim() === '' ? null : Number(draft);
    if (grade !== null && (!Number.isFinite(grade) || grade < 0 || item.maxPoints == null || grade > item.maxPoints)) { setError(`Enter a score from 0 to ${item.maxPoints} for ${item.title}.`); return; }
    const old = cells[cell.studentId]?.[cell.assignmentId];
    if ((old?.grade ?? null) === grade) { setEditing(null); if (move) advance(cell, move); return; }
    savingRef.current = true; setSaving(true); setError(''); setStatus('Saving score…');
    try {
      const result = grade === null ? await clearGrade(cell.assignmentId, cell.studentId) : await upsertGrade(cell.assignmentId, cell.studentId, grade);
      if (!result.success) throw new Error('error' in result ? String(result.error) : 'The score could not be saved.');
      setCells(previous => ({ ...previous, [cell.studentId]: { ...previous[cell.studentId], [cell.assignmentId]: { ...previous[cell.studentId]?.[cell.assignmentId], grade, status: grade === null ? (old?.submittedAt ? 'SUBMITTED' : 'DRAFT') : 'RETURNED', isReturned: grade !== null } as GradebookCell } }));
      setEditing(null); setStatus('Score saved.'); if (move) advance(cell, move);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'The score could not be saved. Your entry is still in the editor.'); setStatus('Score not saved.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  function navigate(event: KeyboardEvent<HTMLTableCellElement>, cell: Cell) {
    if (editing || event.target !== event.currentTarget) return;
    const studentIndex = data.students.findIndex(student => student.id === cell.studentId);
    const assignmentIndex = visible.findIndex(item => item.id === cell.assignmentId);
    const nextStudent = data.students[studentIndex + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0)];
    const nextAssignment = visible[assignmentIndex + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)];
    if (event.key.startsWith('Arrow')) { event.preventDefault(); if (nextStudent && nextAssignment) focusCell(nextStudent.id, nextAssignment.id); }
    if (event.key === 'Enter') { event.preventDefault(); beginEdit(cell); }
  }
  function pageLink(page: number) { return `${standalone ? `/${instituteCode}/gradebooks?course=${encodeURIComponent(courseId)}&` : '?'}page=${page}&period=${tab}`; }
  return <div ref={container} className={'min-w-0 space-y-4 bg-white text-slate-900 dark:bg-[#141721] dark:text-slate-100 ' + (expanded ? 'h-dvh w-screen overflow-auto p-4 sm:p-6' : 'rounded-2xl border border-slate-200 p-0 dark:border-slate-800')}>
    <header className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5"><div><h2 className="text-lg font-semibold">{courseTitle}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Final Grade = Midterm {data.periodPolicy.midtermWeightPercentage}% + Finals {data.periodPolicy.finalsWeightPercentage}%</p><div className="mt-2 flex gap-4 text-xs"><Link className="underline" href={base + '/classwork'}>Open Classwork</Link>{!standalone && <Link className="font-semibold text-orange-700 underline dark:text-orange-300" href={`/${instituteCode}/gradebooks?course=${encodeURIComponent(courseId)}&period=${tab}`}>Open Gradebooks workspace</Link>}</div></div>
      <div className="flex flex-wrap gap-2"><button className={control} disabled={!data.periodsAvailable || saving || !!editing} onClick={() => setDialog('PERIODS')}><Layers size={16}/>Assign periods</button><button className={control} disabled={!data.periodsAvailable || saving || !!editing} onClick={() => setDialog('POLICY')}><Settings size={16}/>Grading policy</button><a className={control} href={`/api/courses/${courseId}/gradebook/export`}><Download size={16}/>Export CSV</a><button className={control} aria-pressed={expanded} onClick={() => void toggleExpanded()}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {expanded ? 'Exit expanded view' : 'Expand gradebook'}</button></div>
    </header>
    {!data.periodsAvailable && <p role="alert" className="mx-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">The period policy database upgrade is required before assigning periods or saving a new policy. Existing scores remain available.</p>}
    {unassigned > 0 && <div className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><p>{unassigned} classwork item{unassigned === 1 ? '' : 's'} need a grading period. Final Grades remain pending until they are assigned.</p><button className="font-semibold underline" disabled={!data.periodsAvailable || saving || !!editing} onClick={() => setDialog('PERIODS')}>Assign now</button></div>}
    <nav aria-label="Grading periods" className="flex flex-wrap gap-2 border-b border-slate-200 px-4 pb-3 dark:border-slate-700">{(['MIDTERM', 'FINALS', 'SUMMARY', 'UNASSIGNED'] as Tab[]).map(value => <button key={value} aria-current={tab === value ? 'page' : undefined} disabled={saving || !!editing} className={'rounded-xl px-4 py-2 text-sm font-semibold ' + (tab === value ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')} onClick={() => changeTab(value)}>{value === 'SUMMARY' ? 'Final Grades' : periodLabel(value)}{value !== 'SUMMARY' && <span className="ml-2 opacity-70">{data.assignments.filter(item => item.gradingPeriod === value).length}</span>}</button>)}</nav>
    <div className="flex flex-wrap justify-between gap-3 px-5 text-sm"><p role="status" aria-live="polite">{status}</p><nav aria-label="Gradebook pages" className="flex gap-4"><span>{data.pagination.total ? `Students ${(data.pagination.page - 1) * data.pagination.pageSize + 1}–${Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of ${data.pagination.total}` : 'No enrolled students'}</span>{data.pagination.page > 1 && <Link href={pageLink(data.pagination.page - 1)}>Previous</Link>}{data.pagination.page < data.pagination.totalPages && <Link href={pageLink(data.pagination.page + 1)}>Next</Link>}</nav></div>
    {error && <p role="alert" className="mx-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {editing && <div className="mx-4 flex flex-wrap items-center gap-3 text-sm"><span>Editing {data.students.find(student => student.id === editing.studentId)?.name} · Enter saves and moves down.</span><button disabled={saving} onMouseDown={event => event.preventDefault()} onClick={() => void save(editing)} className={control}>Retry / save score</button><button disabled={saving} onMouseDown={event => event.preventDefault()} onClick={() => { setEditing(null); setError(''); }}>Cancel edit</button></div>}
    {tab !== 'SUMMARY' && !visible.length && <p className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">No classwork in {periodLabel(tab).toLowerCase()}. Use Assign periods to organize this class.</p>}
    <div aria-label="Gradebook table scroll area" tabIndex={0} className={'isolate overflow-auto ' + (expanded ? 'max-h-[calc(100dvh-270px)]' : 'max-h-[70dvh]')}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth: 240 + visible.length * 160 + (tab === 'SUMMARY' ? 420 : tab === 'UNASSIGNED' ? 0 : 140) }}>
        <caption className="sr-only">{courseTitle} — {tab === 'SUMMARY' ? 'Final Grades' : periodLabel(tab)} gradebook</caption><colgroup><col style={{ width: 240 }}/>{visible.map(item => <col key={item.id} style={{ width: 160 }}/>) }{(tab === 'SUMMARY' ? [1, 2, 3] : tab !== 'UNASSIGNED' ? [1] : []).map(value => <col key={value} style={{ width: 140 }}/>)}</colgroup>
        <thead><tr><th scope="col" className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-[#181B26]">Student</th>{visible.map(item => <th key={item.id} scope="col" className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-[#181B26]"><span className="block truncate" title={item.title}>{item.title}</span><span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{item.maxPoints} pts · {item.type.replaceAll('_', ' ')}</span></th>)}{(tab === 'SUMMARY' ? ['Midterm', 'Finals', 'Final Grade'] : tab !== 'UNASSIGNED' ? [periodLabel(tab) + ' Grade'] : []).map(label => <th key={label} data-grade-total-header scope="col" className="sticky top-0 z-20 border-b border-slate-200 bg-orange-50 p-4 text-right text-orange-900 dark:border-slate-700 dark:bg-[#2A211B] dark:text-orange-200">{label}</th>)}</tr></thead>
        <tbody>{data.students.map(student => <tr key={student.id} className="bg-white even:bg-slate-50 dark:bg-[#141721] dark:even:bg-[#181B26]">
          <th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-4 py-3 text-left dark:border-slate-800"><span className="block font-semibold">{student.name}</span><span className="mt-1 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{student.email}</span></th>
          {visible.map(item => { const cell = cells[student.id]?.[item.id]; const isEditing = editing?.studentId === student.id && editing.assignmentId === item.id; const hasWork = Boolean(cell?.submittedAt || cell?.attachments?.length); const needsGrade = hasWork && cell?.grade == null; return <td key={item.id} id={`grade-cell-${student.id}-${item.id}`} tabIndex={item.labAssignmentId ? undefined : 0} aria-label={`${student.name}, ${item.title}, ${cell?.grade ?? 'not graded'} out of ${item.maxPoints}`} onKeyDown={event => navigate(event, { studentId: student.id, assignmentId: item.id })} onClick={() => { if (!item.labAssignmentId && !isEditing) beginEdit({ studentId: student.id, assignmentId: item.id }); }} className={'border-b border-r border-slate-200 px-3 py-3 focus:outline-2 focus:-outline-offset-2 focus:outline-orange-500 dark:border-slate-800 ' + (needsGrade ? 'bg-amber-50 dark:bg-amber-950/30' : '')}>
            {item.labAssignmentId ? <Link className="inline-flex min-h-10 flex-col justify-center text-orange-700 dark:text-orange-300" href={`${base}/labs/${item.labAssignmentId}?studentId=${encodeURIComponent(student.id)}`}><span className="font-mono">{cell?.grade == null ? 'Review lab' : `${cell.grade}/${item.maxPoints}`}</span><span className="text-xs underline">Open practical lab</span></Link> : isEditing ? <input autoFocus aria-label={`Score for ${student.name} in ${item.title}`} type="number" min={0} max={item.maxPoints ?? undefined} step="0.01" className={field} value={draft} disabled={saving} onChange={event => setDraft(event.target.value)} onClick={event => event.stopPropagation()} onBlur={() => void save({ studentId: student.id, assignmentId: item.id })} onKeyDown={event => { if (['Enter', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); void save({ studentId: student.id, assignmentId: item.id }, event.key === 'ArrowUp' ? -1 : 1); } if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setEditing(null); setError(''); } }}/> : <div className="flex items-center justify-between gap-2"><span className={cell?.grade != null ? 'font-mono font-semibold ' + ((cell.grade / (item.maxPoints || 1)) >= 0.75 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300') : 'text-slate-500 dark:text-slate-400'}>{cell?.grade != null ? `${cell.grade}/${item.maxPoints}` : needsGrade ? 'To grade' : '—'}</span>{cell?.submissionId && hasWork && <button aria-label={`Review ${student.name}'s work for ${item.title}`} className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={event => { event.stopPropagation(); setReview({ studentId: student.id, itemId: item.id }); }}><ExternalLink size={15}/></button>}</div>}
          </td>; })}
          {(tab === 'SUMMARY' ? [totals[student.id].MIDTERM, totals[student.id].FINALS, null] : tab === 'UNASSIGNED' ? [] : [totals[student.id][tab]]).map((result, index) => <td key={index} data-grade-total className="border-b border-slate-200 bg-orange-50/40 px-4 py-3 text-right dark:border-slate-800 dark:bg-[#211D1B]"><Total value={result ? result.percentage : totals[student.id].finalGrade} result={result ?? undefined}/></td>)}
        </tr>)}</tbody>
      </table>
    </div><footer className="px-5 pb-4 text-xs leading-6 text-slate-500 dark:text-slate-400">Desktop: click a score to edit; Enter saves and moves to the next student. Arrow keys navigate cells. Phone view supports reading and reviewing work. Pending totals require every item to have a saved score; missing scores are never treated as zero.</footer>
    {dialog === 'POLICY' && <PeriodPolicyDialog policy={data.periodPolicy} assignments={data.assignments} legacyWeights={data.gradingPolicy?.weights ?? []} onClose={() => setDialog(null)} onSave={async policy => { await saveGradebookPeriodPolicy(courseId, policy); router.refresh(); }}/>} 
    {dialog === 'PERIODS' && <PeriodAssignmentDialog assignments={data.assignments} onClose={() => setDialog(null)} onSave={async rows => { await assignGradebookPeriods(courseId, rows); router.refresh(); }}/>} 
    {review && reviewItem && reviewStudent && reviewCell?.submissionId && <GradeEvaluationModal submission={{ id: reviewCell.submissionId, status: reviewCell.status ?? 'SUBMITTED', grade: reviewCell.grade, isReturned: Boolean(reviewCell.isReturned), submittedAt: reviewCell.submittedAt ? new Date(reviewCell.submittedAt) : null, student: reviewStudent, attachments: reviewCell.attachments ?? [] }} maxPoints={reviewItem.maxPoints} instituteCode={instituteCode} courseId={courseId} itemId={reviewItem.id} onClose={() => setReview(null)} onGraded={(_id, grade) => { setCells(previous => ({ ...previous, [review.studentId]: { ...previous[review.studentId], [review.itemId]: { ...previous[review.studentId][review.itemId], grade, status: 'RETURNED', isReturned: true } } })); setStatus('Score saved.'); }}/>} 
  </div>;
}
