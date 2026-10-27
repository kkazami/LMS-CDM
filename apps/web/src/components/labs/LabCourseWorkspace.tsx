'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, Plus, Database, HelpCircle, X } from 'lucide-react';
import Button from '@/components/common/Button';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { localDateTimeValue } from '@/lib/forms/availability';
import LabTemplateEditor, { blankLab } from './LabTemplateEditor';
import LabAuthoringTour from './LabAuthoringTour';
import { focusLabControl, useLabDialogs } from './LabDialogs';
import { scheduleProblem } from './authoring';
import { LAB_PRESET_COLLECTIONS, LAB_PRESET_OPTIONS, type LabPresetKey } from '@/lib/labs/preset-catalog';
import { labRequest, labStatusLabel, type LabAssignment, type LabDefinition, type LabTemplate, type LabVersion } from './types';

const theme = getInstituteTheme('ics');
const input = 'w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm focus-visible:outline-orange-600 dark:border-slate-600';
const highlight = 'ring-2 ring-orange-500 ring-offset-4 ring-offset-white shadow-lg shadow-orange-500/15 dark:ring-offset-slate-900';
function definition(version: LabVersion): LabDefinition {
  return { title: version.title, description: version.description, category: version.category, objective: version.objective, prerequisites: version.prerequisites, requiredTools: version.requiredTools, estimatedMinutes: version.estimatedMinutes,
    steps: version.steps.map(({ key, type, title, required, config }) => ({ key, type, title, required, config })) };
}

export default function LabCourseWorkspace({ courseId, courseTitle, canEdit, linkItemId, groups, viewerId, linkedDueDate }: {
  courseId: string; courseTitle: string; canEdit: boolean; linkItemId?: string; viewerId: string; linkedDueDate?: string | null;
  groups: { id: string; groupName: string }[];
}) {
  const base = '/api/courses/' + courseId + '/labs';
  const router = useRouter();
  const { confirm, announce, dialog } = useLabDialogs();
  const [assignments, setAssignments] = useState<LabAssignment[]>([]);
  const [templates, setTemplates] = useState<LabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState('');
  const busyRef = useRef(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ templateId?: string; revision?: number; value: LabDefinition } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [versionId, setVersionId] = useState('');
  const [category, setCategory] = useState('ACTIVITY');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(100);
  const [dueDate, setDueDate] = useState(localDateTimeValue(linkedDueDate));
  const [opensAt, setOpensAt] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [formError, setFormError] = useState<{ message: string; target: string } | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const tourKey = 'lms:ics:lab-authoring-tour:v1:' + viewerId;
  const load = useCallback(async () => {
    const [list, library] = await Promise.all([labRequest<LabAssignment[]>(base), canEdit ? labRequest<LabTemplate[]>('/api/labs/templates') : Promise.resolve([])]);
    setAssignments(list); setTemplates(library); setLoadError('');
  }, [base, canEdit]);
  useEffect(() => { void load().catch(e => { const message = e instanceof Error ? e.message : 'Unable to load labs.'; setLoadError(message); announce('Unable to load practical labs', message); }).finally(() => setLoading(false)); }, [load, announce]);
  useEffect(() => {
    if (!canEdit) return;
    try { if (localStorage.getItem(tourKey) !== 'seen') setTourOpen(true); } catch { setTourOpen(true); }
  }, [canEdit, tourKey]);
  const published = templates.flatMap(t => t.versions.filter(v => v.status === 'PUBLISHED').map(v => ({ ...v, templateTitle: t.title })));
  const draftTemplate = templates.find(t => t.id === selectedTemplate && t.versions.some(v => v.status === 'DRAFT')) ?? templates.find(t => t.versions.some(v => v.status === 'DRAFT'));
  const phase = editor ? 0 : versionId ? 2 : draftTemplate ? 1 : published.length ? 2 : 0;
  const nextTarget = editor ? 'lab-save-draft' : phase === 0 ? 'lab-start-mysql' : phase === 1 ? 'lab-publish-' + draftTemplate?.id : 'lab-version';
  function next() { focusLabControl(nextTarget); }
  async function action(work: () => Promise<void>, errorTitle = 'Unable to complete this action') {
    if (busyRef.current || createdAssignment) return false;
    busyRef.current = true; setBusy(true); setNotice('');
    try { await work(); return true; }
    catch (e) { announce(errorTitle, e instanceof Error ? e.message : 'Try again. Your work has been kept.'); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function edit(id: string) {
    const template = await labRequest<LabTemplate>('/api/labs/templates/' + id);
    const draft = template.versions.find(v => v.status === 'DRAFT');
    if (!draft) { announce('Instructions are published', 'Choose this published version in the classwork details to assign it.'); return; }
    setSelectedTemplate(id); setEditor({ templateId: id, revision: draft.revision, value: { ...definition(draft), category: template.category } });
    focusLabControl('lab-editor');
  }
  async function startPreset(preset: LabPresetKey) {
    await action(async () => {
      const template = await labRequest<{ id: string }>('/api/labs/templates', {
        method: 'POST', body: JSON.stringify({ preset }),
      });
      await load();
      await edit(template.id);
    }, 'Starter lab could not be created');
  }
  async function leave(href: string) {
    if (busyRef.current || createdAssignment) return;
    if (!editor || await confirm('Leave the lab editor?', 'Unsaved changes will be lost. Saved drafts remain in your lab instructions.', 'Leave editor')) router.push(href);
  }
  async function publish(template: LabTemplate) {
    if (!await confirm('Publish these instructions?', 'This version will be locked for consistent student instructions. You will assign it to Classwork next; students cannot see it yet.', 'Publish instructions')) return;
    await action(async () => {
      const draft = template.versions.find(v => v.status === 'DRAFT')!;
      await labRequest('/api/labs/templates/' + template.id + '/publish', { method: 'POST', body: JSON.stringify({ expectedRevision: draft.revision }) });
      await load(); setVersionId(draft.id); setTitle(template.title); setSelectedTemplate(template.id);
      announce('Instructions published', 'Next, set the classwork category, points and dates. Creating the classwork will give you a final review before students can see it.', 'Set classwork details', () => focusLabControl('lab-version'));
    }, 'Instructions could not be published');
  }
  function problem(message: string, target: string) {
    setFormError({ message, target });
    announce('Check the classwork details', message, 'Show me where', () => focusLabControl(target));
  }
  async function assign() {
    setFormError(null);
    if (loading || busyRef.current || createdAssignment) return;
    if (editor) { announce('Save your instructions first', 'Save the draft and publish its instructions before assigning the lab.', 'Go to draft', () => focusLabControl('lab-save-draft')); return; }
    if (!versionId) { problem('Choose published instructions first. If there are none, save and publish your draft.', published.length ? 'lab-version' : nextTarget); return; }
    if (!linkItemId && (!Number.isInteger(points) || points < 1 || points > 100000)) { problem('Enter maximum points from 1 to 100,000.', 'lab-points'); return; }
    if (!linkItemId && category === 'CUSTOM' && !customCategory.trim()) { problem('Enter a custom grading category.', 'lab-custom-category'); return; }
    const dateError = scheduleProblem(opensAt, dueDate);
    if (dateError) { problem(dateError, 'lab-due-date'); return; }
    await action(async () => {
      const a = await labRequest<LabAssignment>(base, { method: 'POST', body: JSON.stringify({ versionId,
        ...(linkItemId ? { syllabusItemId: linkItemId } : { title: title.trim() || undefined, category: category === 'CUSTOM' ? customCategory.trim() : category, maxPoints: points, dueDate: dueDate ? new Date(dueDate).toISOString() : null, targetGroupIds: targetGroups }),
        opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      }) }); setCreatedAssignment(a.id); router.push('/ics/courses/' + courseId + '/labs/' + a.id);
    }, 'Classwork could not be created');
  }
  const invalid = (target: string) => formError?.target === target;
  return <div className="mx-auto max-w-5xl space-y-7 pb-24">
    <Link className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-500 hover:text-orange-700" href={'/ics/courses/' + courseId + '/classwork'} onClick={e => { if (busyRef.current || createdAssignment) { e.preventDefault(); return; } if (editor) { e.preventDefault(); void leave('/ics/courses/' + courseId + '/classwork'); } }}><ArrowLeft size={16} />Back to Classwork</Link>
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6 dark:border-slate-700">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-300">{courseTitle}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Guided practical labs</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{canEdit ? 'Create the instructions, assign the lab, then publish it for your students.' : 'Follow the instructions on your own computer and submit your evidence for feedback.'}</p></div>
      <FlaskConical className="h-10 w-10 text-orange-600" aria-hidden="true" />
    </header>
    {canEdit && <section aria-label="Lab creation progress" className="sticky top-20 z-20 rounded-2xl border border-orange-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-orange-900 dark:bg-slate-900/95">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">Next: {phase === 0 ? editor ? 'save your instructions' : 'start your instructions' : phase === 1 ? 'publish your saved instructions' : 'set the classwork details'}</p><button type="button" className="inline-flex min-h-10 items-center gap-1 text-sm text-orange-700 dark:text-orange-300" onClick={() => setTourOpen(true)}><HelpCircle size={16} />How to create a lab</button></div>
      <ol className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{['Write & save', 'Publish instructions', 'Assign to class', 'Publish classwork'].map((label, i) => <li key={label} aria-current={i === phase ? 'step' : undefined} className={'flex items-center gap-2 rounded-lg px-3 py-2 ' + (i === phase ? 'bg-orange-100 font-semibold text-orange-900 dark:bg-orange-950 dark:text-orange-100' : 'bg-slate-50 text-slate-500 dark:bg-slate-800')}><span>{i < phase ? <CheckCircle2 size={15} /> : i + 1}</span>{label}</li>)}</ol>
      <button type="button" onClick={next} className="mt-3 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">{phase === 0 ? editor ? 'Go to Save draft' : 'Choose how to start' : phase === 1 ? 'Go to Publish instructions' : 'Go to classwork details'}<ArrowRight size={15} /></button>
    </section>}
    {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<button className="ml-3 underline" onClick={() => void action(load)}>Retry loading</button></div>}
    {createdAssignment && <p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">Classwork draft created. Opening it for your final review… <Link className="underline" href={'/ics/courses/' + courseId + '/labs/' + createdAssignment}>Open classwork draft</Link></p>}
    {notice && <div role="status" className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-4 rounded-xl border border-orange-200 bg-white p-4 text-sm shadow-xl dark:border-orange-800 dark:bg-slate-900"><div><p>{notice}</p><button type="button" className="mt-2 min-h-9 font-semibold text-orange-700 dark:text-orange-300" onClick={next}>Show next step →</button></div><button type="button" aria-label="Dismiss notification" className="min-h-10 min-w-10 p-2" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {loading ? <p role="status" className="py-10 text-sm text-slate-500">Loading practical labs…</p> : <section aria-labelledby="assigned-labs" className="space-y-3">
      <h2 id="assigned-labs" className="text-lg font-semibold">Assigned labs</h2>
      {!assignments.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{canEdit ? 'Your classwork will appear here after you assign a lab. Start with the instructions below.' : 'No practical labs are available yet.'}</p>}
      {assignments.map(a => <Link key={a.id} href={'/ics/courses/' + courseId + '/labs/' + a.id} onClick={e => { if (busyRef.current || createdAssignment) { e.preventDefault(); return; } if (editor) { e.preventDefault(); void leave('/ics/courses/' + courseId + '/labs/' + a.id); } }} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-orange-400 dark:border-slate-700 dark:bg-slate-900">
        <div><p className="text-xs text-orange-700 dark:text-orange-300">{a.syllabusItem.type.replaceAll('_', ' ')} · {labStatusLabel[a.status] ?? a.status}</p><h3 className="mt-1 font-semibold">{a.syllabusItem.title}</h3><p className="mt-2 text-xs text-slate-500">{a.syllabusItem.maxPoints} points{a.syllabusItem.dueDate ? ' · Due ' + new Date(a.syllabusItem.dueDate).toLocaleString() : ''}</p></div><span className="text-sm font-medium text-orange-700 dark:text-orange-300">{canEdit ? a.status === 'DRAFT' ? 'Continue to publish →' : 'Review submissions →' : 'Open lab →'}</span>
      </Link>)}
    </section>}
    {canEdit && <>
      <section className="space-y-4 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="lab-templates">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="lab-templates" className="text-lg font-semibold">1. Write and save the instructions</h2><p className="mt-1 text-sm text-slate-500">Choose a starter or build the steps yourself. Every starter opens as your editable draft.</p></div>
          <Button theme={theme} variant="secondary" disabled={loading || busy || Boolean(createdAssignment) || Boolean(editor)} onClick={() => { setEditor({ value: structuredClone(blankLab) }); focusLabControl('lab-editor'); }}><Plus size={16} className="mr-2" />Create lab</Button>
        </div>
        <div aria-label="Practical lab starters" className="space-y-6">
          {LAB_PRESET_COLLECTIONS.map(collection => <section key={collection.key} aria-labelledby={'lab-collection-' + collection.key} className="space-y-3">
            <div><h3 id={'lab-collection-' + collection.key} className="font-semibold">{collection.title}</h3><p className="mt-1 text-sm text-slate-500">{collection.description}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {LAB_PRESET_OPTIONS.filter(option => option.collection === collection.key).map(option => <div key={option.key} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">{option.category} · {option.minutes} min</p><h4 className="mt-1 font-semibold">{option.title}</h4><p className="mt-1 text-sm text-slate-500">{option.summary}</p></div>
                <Button id={'lab-start-' + option.key.toLowerCase()} className={'self-start ' + (phase === 0 && !editor && option.key === 'MYSQL' ? highlight : '')} theme={theme} variant="secondary" loading={busy} disabled={loading || busy || Boolean(createdAssignment) || Boolean(editor)} onClick={() => void startPreset(option.key)}>{option.key === 'MYSQL' ? <Database size={16} className="mr-2" /> : <FlaskConical size={16} className="mr-2" />}Start with {option.startLabel}</Button>
              </div>)}
            </div>
          </section>)}
        </div>
        {templates.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div><h3 className="font-medium">{t.title}</h3><p className="mt-1 text-xs text-slate-500">{t.versions.map(v => 'v' + v.number + ' · ' + (labStatusLabel[v.status] ?? v.status)).join(' / ')}</p></div><div className="flex flex-wrap gap-3">{t.versions.some(v => v.status === 'DRAFT') ? <><Button theme={theme} variant="secondary" disabled={loading || busy || Boolean(createdAssignment) || Boolean(editor)} onClick={() => void action(() => edit(t.id))}>Edit draft</Button><Button id={'lab-publish-' + t.id} theme={theme} className={phase === 1 && draftTemplate?.id === t.id ? highlight : ''} disabled={loading || busy || Boolean(createdAssignment) || Boolean(editor)} onClick={() => void publish(t)}>Publish instructions</Button></> : <Button theme={theme} variant="secondary" disabled={loading || busy || Boolean(createdAssignment) || Boolean(editor)} onClick={() => { const v = t.versions.find(v => v.status === 'PUBLISHED'); if (v) { setVersionId(v.id); setTitle(t.title); setSelectedTemplate(t.id); focusLabControl('lab-version'); } }}>Use these instructions</Button>}</div></div>)}
      </section>
      {editor && <LabTemplateEditor key={(editor.templateId ?? 'new') + ':' + editor.revision} initial={editor.value} busy={busy} onUploadBusy={pending => { busyRef.current = pending; setBusy(pending); }} onClose={() => { setEditor(null); focusLabControl(editor.templateId ? 'lab-publish-' + editor.templateId : 'lab-start-mysql'); }} onSave={async value => {
        const saved = await action(async () => {
          let id = editor.templateId;
          if (id) await labRequest('/api/labs/templates/' + id, { method: 'PATCH', body: JSON.stringify({ ...value, expectedRevision: editor.revision }) });
          else id = (await labRequest<{ id: string }>('/api/labs/templates', { method: 'POST', body: JSON.stringify(value) })).id;
          await load(); setSelectedTemplate(id); setEditor(null); setVersionId(''); setNotice('Draft saved. Next, publish its instructions.'); focusLabControl('lab-publish-' + id);
        }, 'Draft could not be saved'); return saved;
      }} />}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="assign-lab">
        <h2 id="assign-lab" className="text-lg font-semibold">3. {linkItemId ? 'Link to existing Classwork' : 'Assign to your class'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Choose the grading category, points and schedule. You will publish the classwork on the next screen.</p>
        {linkItemId && <p className="mt-3 text-sm">The existing Classwork keeps its title, category, points and due date. Its history must prove no student work has started.</p>}
        <form noValidate className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void assign(); }}>
          <fieldset disabled={busy || Boolean(createdAssignment)} className="contents">
          <label className="space-y-1 text-sm sm:col-span-2">Published instructions<select id="lab-version" aria-invalid={invalid('lab-version')} aria-describedby={invalid('lab-version') ? 'lab-assignment-error' : undefined} className={input + (phase === 2 && !versionId ? ' border-orange-500 ring-2 ring-orange-200' : '')} value={versionId} onChange={e => { setVersionId(e.target.value); setFormError(null); }}><option value="">Choose a published version</option>{published.map(v => <option key={v.id} value={v.id}>{v.title || v.templateTitle} · v{v.number}</option>)}</select></label>
          {!linkItemId && <><label className="space-y-1 text-sm sm:col-span-2">Classwork title<input className={input} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Use the lab title" /></label><label className="space-y-1 text-sm">Grading category<select className={input} value={category} onChange={e => setCategory(e.target.value)}>{['ACTIVITY', 'ASSIGNMENT', 'QUIZ', 'RECITATION', 'MIDTERM_EXAM', 'FINAL_EXAM', 'CUSTOM'].map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}</select></label><label className="space-y-1 text-sm">Maximum points<input id="lab-points" aria-invalid={invalid('lab-points')} className={input} type="number" min={1} max={100000} value={points} onChange={e => setPoints(Number(e.target.value))} /></label>{category === 'CUSTOM' && <label className="space-y-1 text-sm sm:col-span-2">Custom category<input id="lab-custom-category" aria-invalid={invalid('lab-custom-category')} className={input} maxLength={80} value={customCategory} onChange={e => setCustomCategory(e.target.value)} /></label>}</>}
          <label className="space-y-1 text-sm">Start date<input id="lab-start-date" aria-label="Start date" className={input} type="datetime-local" value={opensAt} onChange={e => { setOpensAt(e.target.value); setFormError(null); }} /><span className="block text-xs leading-5 text-slate-500">Students can begin at this time. Leave blank to start when you publish.</span></label>
          <label className="space-y-1 text-sm">Due date<input id="lab-due-date" aria-label="Due date" aria-invalid={invalid('lab-due-date')} aria-describedby={invalid('lab-due-date') ? 'lab-assignment-error' : undefined} className={input + (invalid('lab-due-date') ? ' border-red-500 ring-2 ring-red-200' : '')} type="datetime-local" readOnly={Boolean(linkItemId)} value={dueDate} onChange={e => { setDueDate(e.target.value); setFormError(null); }} /><span className="block text-xs leading-5 text-slate-500">{linkItemId ? 'Kept from the existing Classwork.' : 'The submission deadline. Choose a time after the start date, or leave blank for no deadline.'}</span></label>
          {!linkItemId && groups.length > 0 && <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm">Target groups · leave empty for all approved students</legend><div className="flex flex-wrap gap-4">{groups.map(g => <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={targetGroups.includes(g.id)} onChange={e => setTargetGroups(e.target.checked ? [...targetGroups, g.id] : targetGroups.filter(id => id !== g.id))} />{g.groupName}</label>)}</div></fieldset>}
          {formError && <p id="lab-assignment-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:col-span-2">{formError.message}<button type="button" className="ml-2 underline" onClick={() => focusLabControl(formError.target)}>Go to field</button></p>}
          <div className="space-y-3 sm:col-span-2"><Button theme={theme} type="submit" loading={busy || Boolean(createdAssignment)} disabled={loading} className={phase === 2 && versionId ? highlight : ''}>{linkItemId ? 'Link practical lab' : 'Assign practical lab'}</Button><p className="text-xs text-slate-500">Next: review and publish the Classwork. Practical exam categories do not lock down or proctor student devices.</p>{!published.length && <button type="button" onClick={next} className="min-h-10 text-sm font-semibold text-orange-700 dark:text-orange-300">First, save and publish your instructions ↑</button>}</div>
          </fieldset>
        </form>
      </section>
    </>}
    {tourOpen && !dialog && !loading && !loadError && <LabAuthoringTour onClose={() => { try { localStorage.setItem(tourKey, 'seen'); } catch {} setTourOpen(false); next(); }} />}
    {dialog}
  </div>;
}
