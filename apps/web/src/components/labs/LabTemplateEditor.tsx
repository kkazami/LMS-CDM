'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, Save, Eye } from 'lucide-react';
import Button from '@/components/common/Button';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import LabStepContent from './LabStepContent';
import LabStepResourceEditor from './LabStepResourceEditor';
import { focusLabControl, useLabDialogs } from './LabDialogs';
import { draftProblems } from './authoring';
import type { LabDefinition, LabStep, LabStepType } from './types';

const theme = getInstituteTheme('ics');
const input = 'w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm focus-visible:outline-orange-600 dark:border-slate-600';
const stepNames: Record<LabStepType, string> = { INSTRUCTIONS: 'Instructions', COMMAND: 'Command', CHECKLIST: 'Checklist', TEXT_RESPONSE: 'Short answer', EVIDENCE_UPLOAD: 'Evidence upload' };
export const blankLab: LabDefinition = {
  title: 'New practical lab', description: '', category: 'OTHER', objective: '', prerequisites: '', requiredTools: '', estimatedMinutes: 30,
  steps: [{ key: 'introduction', title: 'Getting started', type: 'INSTRUCTIONS', required: true, config: { body: '' } }],
};
function newStep(type: LabStepType): LabStep {
  return { key: crypto.randomUUID(), title: stepNames[type], type, required: true, config:
    type === 'INSTRUCTIONS' ? { body: '' } : type === 'COMMAND' ? { body: '', command: '', language: 'sql' } :
    type === 'CHECKLIST' ? { items: [{ id: crypto.randomUUID(), label: '', required: true }] } :
    type === 'TEXT_RESPONSE' ? { prompt: '', maxLength: 2000 } : { instructions: '', minFiles: 1, maxFiles: 1 } };
}

export default function LabTemplateEditor({ initial, busy, onSave, onClose, onUploadBusy }: {
  initial: LabDefinition; busy: boolean; onSave: (definition: LabDefinition) => Promise<boolean>; onClose: () => void; onUploadBusy?: (busy: boolean) => void;
}) {
  const { confirm, announce, dialog } = useLabDialogs();
  const [problems, setProblems] = useState<ReturnType<typeof draftProblems>>([]);
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [addType, setAddType] = useState<LabStepType>('INSTRUCTIONS');
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);
  function update(next: LabDefinition) { setDraft(next); setDirty(true); if (problems.length) setProblems(draftProblems(next)); }
  function stepAt(index: number, next: LabStep) { update({ ...draft, steps: draft.steps.map((s, i) => i === index ? next : s) }); }
  function move(index: number, direction: number) {
    const steps = [...draft.steps]; [steps[index], steps[index + direction]] = [steps[index + direction], steps[index]];
    update({ ...draft, steps });
  }
  async function save() {
    if (busy || uploading) return;
    const missing = draftProblems(draft); setProblems(missing);
    if (missing.length) {
      setPreview(false);
      announce('Complete the draft before saving', missing.map(p => p.message).join('\n'), 'Show first missing field', () => focusLabControl(missing[0].target));
      return;
    }
    if (await onSave(draft)) setDirty(false);
  }
  return <section id="lab-editor" tabIndex={-1} aria-label="Practical lab editor" className="scroll-mt-64 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-7 dark:border-slate-700 dark:bg-slate-900">
    <fieldset disabled={busy || uploading} aria-label="Lab draft fields" className="min-w-0 space-y-6 border-0 p-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Edit lab instructions</h2><p className="mt-1 text-xs text-slate-500">{dirty ? 'Unsaved changes' : 'Draft editor'} · published instructions stay unchanged</p></div>
      <div className="flex gap-2"><Button theme={theme} variant="secondary" onClick={() => setPreview(!preview)}><Eye size={16} className="mr-2" />{preview ? 'Edit' : 'Preview'}</Button><Button theme={theme} variant="ghost" onClick={async () => { if (!dirty || await confirm('Discard unsaved changes?', 'Your latest edits have not been saved. You can keep editing or close this draft.', 'Discard changes')) onClose(); }}>Close editor</Button></div>
    </div>
    {problems.length > 0 && <div id="lab-draft-errors" role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Complete these before saving:</p><ul className="mt-2 space-y-1">{problems.map((p, i) => <li key={i}><button type="button" className="min-h-9 text-left underline" onClick={() => focusLabControl(p.target)}>{p.message}</button></li>)}</ul></div>}
    {!preview && <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm sm:col-span-2">Title<input id="lab-title" aria-invalid={problems.some(p => p.target === 'lab-title')} className={input} value={draft.title} maxLength={160} onChange={e => update({ ...draft, title: e.target.value })} /></label>
      <label className="space-y-1 text-sm sm:col-span-2">Description<textarea className={input} rows={2} value={draft.description} maxLength={5000} onChange={e => update({ ...draft, description: e.target.value })} /></label>
      <label className="space-y-1 text-sm">Template category<select className={input} value={draft.category} onChange={e => update({ ...draft, category: e.target.value })}>{['DATABASE', 'OPERATING_SYSTEMS', 'NETWORKING', 'HARDWARE', 'OTHER'].map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm">Estimated minutes<input id="lab-estimatedMinutes" className={input} type="number" min={1} max={1440} value={draft.estimatedMinutes} onChange={e => update({ ...draft, estimatedMinutes: Number(e.target.value) })} /></label>
      {(['objective', 'prerequisites', 'requiredTools'] as const).map(field => <label key={field} className="space-y-1 text-sm sm:col-span-2">{field === 'requiredTools' ? 'Required tools' : field[0].toUpperCase() + field.slice(1)}<textarea id={'lab-' + field} aria-invalid={problems.some(p => p.target === 'lab-' + field)} className={input} rows={2} maxLength={5000} value={draft[field]} onChange={e => update({ ...draft, [field]: e.target.value })} /></label>)}
    </div>}
    {preview && <div><h3 className="text-2xl font-semibold">{draft.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm">{draft.objective}</p></div>}
    <ol className="space-y-5">{draft.steps.map((step, index) => <li key={step.key} id={'lab-step-' + index} tabIndex={-1} className={'scroll-mt-64 rounded-xl border p-4 outline-orange-600 sm:p-5 ' + (problems.some(p => p.target === 'lab-step-' + index) ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 dark:border-slate-700')}>
      <div className="mb-4 flex flex-wrap items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200">{index + 1}</span>
        {preview ? <h3 className="font-medium">{step.title}</h3> : <input aria-label={'Step ' + (index + 1) + ' title'} className={input + ' min-w-32 flex-1 sm:w-auto'} maxLength={160} value={step.title} onChange={e => stepAt(index, { ...step, title: e.target.value })} />}
        <span className="text-xs text-slate-500">{stepNames[step.type]}</span>
        {!preview && <div className="ml-auto flex gap-1"><button type="button" aria-label={'Move step ' + (index + 1) + ' up'} disabled={index === 0} className="rounded p-2 disabled:opacity-30" onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={'Move step ' + (index + 1) + ' down'} disabled={index === draft.steps.length - 1} className="rounded p-2 disabled:opacity-30" onClick={() => move(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label={'Delete step ' + (index + 1)} disabled={draft.steps.length === 1} className="rounded p-2 text-red-600 disabled:opacity-30" onClick={() => update({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>}
      </div>
      {preview ? <LabStepContent step={step} disabled onChange={() => {}} /> : <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={step.required} onChange={e => stepAt(index, { ...step, required: e.target.checked })} />Required step</label>
        {(step.type === 'INSTRUCTIONS' || step.type === 'COMMAND') && <label className="block space-y-1 text-sm">Instructions<textarea className={input} rows={4} maxLength={10000} value={step.config.body ?? ''} onChange={e => stepAt(index, { ...step, config: { ...step.config, body: e.target.value } })} /></label>}
        {step.type === 'COMMAND' && <label className="block space-y-1 text-sm">Commands to display<textarea className={input + ' font-mono'} rows={5} maxLength={10000} value={step.config.command ?? ''} onChange={e => stepAt(index, { ...step, config: { ...step.config, command: e.target.value } })} /></label>}
        {step.type === 'TEXT_RESPONSE' && <><label className="block space-y-1 text-sm">Question<textarea className={input} rows={3} maxLength={10000} value={step.config.prompt ?? ''} onChange={e => stepAt(index, { ...step, config: { ...step.config, prompt: e.target.value } })} /></label><label className="block space-y-1 text-sm">Maximum answer length<input className={input} type="number" min={1} max={5000} value={step.config.maxLength} onChange={e => stepAt(index, { ...step, config: { ...step.config, maxLength: Number(e.target.value) } })} /></label></>}
        {step.type === 'EVIDENCE_UPLOAD' && <><label className="block space-y-1 text-sm">Evidence instructions<textarea className={input} rows={3} maxLength={10000} value={step.config.instructions ?? ''} onChange={e => stepAt(index, { ...step, config: { ...step.config, instructions: e.target.value } })} /></label><div className="flex gap-4">{(['minFiles', 'maxFiles'] as const).map(field => <label key={field} className="space-y-1 text-sm">{field === 'minFiles' ? 'Minimum files' : 'Maximum files'}<input className={input} type="number" min={field === 'minFiles' ? 0 : 1} max={3} value={step.config[field]} onChange={e => stepAt(index, { ...step, config: { ...step.config, [field]: Number(e.target.value) } })} /></label>)}</div></>}
        {step.type === 'CHECKLIST' && <div className="space-y-2">{step.config.items?.map((item, i) => <div key={item.id} className="flex items-center gap-2"><input aria-label={'Checklist item ' + (i + 1)} className={input} maxLength={300} value={item.label} onChange={e => stepAt(index, { ...step, config: { ...step.config, items: step.config.items?.map((v, n) => n === i ? { ...v, label: e.target.value } : v) } })} /><label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={item.required} onChange={e => stepAt(index, { ...step, config: { ...step.config, items: step.config.items?.map((v, n) => n === i ? { ...v, required: e.target.checked } : v) } })} />Required</label><button type="button" aria-label={'Remove checklist item ' + (i + 1)} disabled={(step.config.items?.length ?? 0) <= 1} onClick={() => stepAt(index, { ...step, config: { ...step.config, items: step.config.items?.filter((_, n) => n !== i) } })} className="p-2 text-red-600 disabled:opacity-30"><Trash2 size={14} /></button></div>)}<button type="button" className="min-h-10 text-sm font-medium text-orange-700" onClick={() => stepAt(index, { ...step, config: { ...step.config, items: [...(step.config.items ?? []), { id: crypto.randomUUID(), label: '', required: true }] } })}>+ Add checklist item</button></div>}
        <LabStepResourceEditor stepNumber={index + 1} resources={step.config.resources} onChange={resources => stepAt(index, { ...step, config: { ...step.config, resources } })} onUploadBusy={pending => { setUploading(pending); onUploadBusy?.(pending); }} />
      </div>}
    </li>)}</ol>
    {!preview && <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:border-orange-900 dark:bg-slate-900"><select aria-label="New step type" className={input + ' sm:w-auto'} value={addType} onChange={e => setAddType(e.target.value as LabStepType)}>{Object.entries(stepNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button theme={theme} variant="secondary" disabled={draft.steps.length >= 30} onClick={() => update({ ...draft, steps: [...draft.steps, newStep(addType)] })}><Plus size={16} className="mr-2" />Add step</Button><Button id="lab-save-draft" className="ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900" theme={theme} loading={busy} onClick={() => void save()}><Save size={16} className="mr-2" />Save draft</Button></div>}
    {preview && <div className="sticky bottom-4 rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:bg-slate-900"><Button id="lab-save-draft" theme={theme} loading={busy} onClick={() => void save()}>Save draft</Button></div>}
    </fieldset>
    {dialog}
  </section>;
}
