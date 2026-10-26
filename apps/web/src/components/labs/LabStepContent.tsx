'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { LabStep, LabResponse } from './types';

export default function LabStepContent({ step, response, disabled, onChange }: {
  step: LabStep; response?: LabResponse; disabled: boolean;
  onChange: (answer: LabResponse['answer']) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const answer = response?.answer ?? {};
  if (step.type === 'INSTRUCTIONS' || step.type === 'COMMAND') return <div className="space-y-5">
    <p className="whitespace-pre-wrap text-sm leading-7">{step.config.body}</p>
    {step.type === 'COMMAND' && <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-xs dark:bg-slate-800">
        <span>{step.config.language || 'Command'} · run in your own environment</span>
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded px-2 focus-visible:outline-2" onClick={async () => {
          try { await navigator.clipboard.writeText(step.config.command ?? ''); setCopied(true); setCopyError(''); }
          catch { setCopyError('Select the command below and copy it manually.'); }
        }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="overflow-x-auto bg-slate-950 p-5 text-sm leading-7 text-slate-100"><code>{step.config.command}</code></pre>
      {copyError && <p role="status" className="p-3 text-sm">{copyError}</p>}
    </div>}
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" disabled={disabled} checked={answer.acknowledged ?? false} onChange={e => onChange({ acknowledged: e.target.checked })} />
      <span className="text-sm">{step.type === 'COMMAND' ? 'I completed these commands in my approved environment.' : 'I have read these instructions.'}</span>
    </label>
  </div>;
  if (step.type === 'CHECKLIST') return <div className="space-y-3">{step.config.items?.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" disabled={disabled} checked={answer.checkedIds?.includes(item.id) ?? false} onChange={e => onChange({ checkedIds: e.target.checked ? [...(answer.checkedIds ?? []), item.id] : (answer.checkedIds ?? []).filter(id => id !== item.id) })} />
    <span className="text-sm">{item.label}{item.required && <span className="ml-2 text-xs text-slate-500">Required</span>}</span>
  </label>)}</div>;
  if (step.type === 'TEXT_RESPONSE') return <div className="space-y-3">
    <label htmlFor={'response-' + step.key} className="block whitespace-pre-wrap text-sm leading-7">{step.config.prompt}</label>
    <textarea id={'response-' + step.key} rows={7} maxLength={step.config.maxLength ?? 5000} disabled={disabled} value={answer.text ?? ''} onChange={e => onChange({ text: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-transparent p-4 text-sm leading-7 outline-offset-4 focus-visible:outline-orange-600 dark:border-slate-600" />
    <p className="text-right text-xs text-slate-500">{answer.text?.length ?? 0} / {step.config.maxLength ?? 5000}</p>
  </div>;
  return <p className="whitespace-pre-wrap text-sm leading-7">{step.config.instructions}</p>;
}
