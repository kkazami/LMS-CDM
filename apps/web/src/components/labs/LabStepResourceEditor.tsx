'use client';

import { useState } from 'react';
import { ImagePlus, Link2, Play, Trash2 } from 'lucide-react';
import { LAB_IMAGE_TYPES, type LabResource } from '@/lib/labs/resources';
import { labRequest } from './types';

const input = 'w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600';
export default function LabStepResourceEditor({ resources = [], stepNumber, onChange, onUploadBusy }: {
  resources?: LabResource[]; stepNumber: number; onChange: (value: LabResource[]) => void; onUploadBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const update = (index: number, value: LabResource) => onChange(resources.map((resource, i) => i === index ? value : resource));
  return <details className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600" open={resources.length > 0 || uploading || Boolean(error)}>
    <summary className="min-h-9 cursor-pointer text-sm font-medium">Optional video, screenshot, or guide{resources.length ? ' · ' + resources.length : ''}</summary>
    <p className="mb-3 mt-2 text-xs leading-6 text-slate-500">Paste a YouTube link or upload a screenshot for this step. Students keep their place while using the help. Maximum four resources; screenshots up to 3 MiB.</p>
    {resources.map((resource, index) => <div key={index} className="mb-4 space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold">{resource.type === 'YOUTUBE' ? 'YouTube video' : resource.type === 'IMAGE' ? 'Screenshot' : 'Reference guide'}</span><button type="button" aria-label={'Remove help ' + (index + 1) + ' from step ' + stepNumber} className="min-h-10 min-w-10 rounded p-2 text-red-600" onClick={() => onChange(resources.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div>
      <label className="block space-y-1 text-sm">Help title<input className={input} aria-label={'Step ' + stepNumber + ' help ' + (index + 1) + ' title'} maxLength={120} value={resource.title} onChange={e => update(index, { ...resource, title: e.target.value })} /></label>
      {resource.type !== 'IMAGE' ? <label className="block space-y-1 text-sm">{resource.type === 'YOUTUBE' ? 'YouTube link' : 'HTTPS guide link'}<input type="url" className={input} aria-label={'Step ' + stepNumber + ' help ' + (index + 1) + ' link'} maxLength={2000} placeholder={resource.type === 'YOUTUBE' ? 'https://www.youtube.com/watch?v=…' : 'https://…'} value={resource.url} onChange={e => update(index, { ...resource, url: e.target.value })} /></label> : <p className="text-xs text-slate-500">Screenshot attached. Use Preview to check its appearance.</p>}
      <label className="block space-y-1 text-sm">Caption or viewing tip (optional)<textarea className={input} rows={2} maxLength={500} value={resource.caption ?? ''} onChange={e => update(index, { ...resource, caption: e.target.value })} /></label>
    </div>)}
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {uploading && <p role="status" className="mb-3 text-sm">Uploading and scanning screenshot… Save will be available when this finishes.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={resources.length >= 4 || uploading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-600" onClick={() => onChange([...resources, { type: 'YOUTUBE', title: 'Video guide', url: '' }])}><Play size={15} />Add YouTube video</button>
      <label className={'inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 ' + (resources.length >= 4 || uploading ? 'opacity-40' : 'cursor-pointer')}><ImagePlus size={15} />Add screenshot<input type="file" className="sr-only" aria-label={'Step ' + stepNumber + ' screenshot'} accept="image/png,image/jpeg,image/webp" disabled={resources.length >= 4 || uploading} onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        if (file.size > 3 * 1024 * 1024 || !file.size || !LAB_IMAGE_TYPES.some(type => type === file.type)) { setError('Choose a PNG, JPEG, or WebP screenshot up to 3 MiB.'); return; }
        setError(''); setUploading(true); onUploadBusy(true);
        try {
          const body = new FormData(); body.set('file', file);
          const uploaded = await labRequest<{ url: string; fileName: string }>('/api/labs/templates/media', { method: 'POST', body });
          onChange([...resources, { type: 'IMAGE', title: uploaded.fileName.slice(0, 120), url: uploaded.url }]);
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Screenshot upload failed. Try again.'); }
        finally { setUploading(false); onUploadBusy(false); }
      }} /></label>
      <button type="button" disabled={resources.length >= 4 || uploading} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm underline disabled:opacity-40" onClick={() => onChange([...resources, { type: 'LINK', title: 'Reference guide', url: '' }])}><Link2 size={15} />Add reference link</button>
    </div>
  </details>;
}
