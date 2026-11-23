"use client";

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { materialPreviewUrl } from '@/lib/material-preview';

type Preview = { text: string; truncated: boolean };

export default function OfficeAttachmentPreview({ attachmentId }: { attachmentId: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    async function loadPreview() {
      try {
        const response = await fetch(materialPreviewUrl(attachmentId), { signal, cache: 'no-store' });
        const body = await response.json().catch(() => null);
        if (!response.ok || typeof body?.text !== 'string') {
          throw new Error(typeof body?.message === 'string' ? body.message : 'The preview could not be opened.');
        }
        if (!controller.signal.aborted) setPreview({ text: body.text, truncated: body.truncated === true });
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(signal.aborted ? 'The preview took too long to load.' : error instanceof Error ? error.message : 'The preview could not be opened.');
        }
      }
    }
    void loadPreview();
    return () => controller.abort();
  }, [attachmentId]);

  if (error || (preview && !preview.text)) {
    return (
      <div className="m-auto max-w-sm p-6 text-center">
        <FileText aria-hidden="true" className="mx-auto mb-3 size-7 text-slate-500" />
        <h2 className="font-semibold">Preview unavailable</h2>
        <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error || 'This file has no text to display.'}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use the Download button to open the original in an Office app.</p>
      </div>
    );
  }

  if (!preview) return <p role="status" className="m-auto p-6 text-sm text-slate-600 dark:text-slate-300">Loading document preview…</p>;

  return (
    <article className="w-full min-w-0 bg-white px-4 py-5 sm:px-8 dark:bg-[#141721]">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-semibold">Text preview</h2>
        <p className="mb-5 mt-1 text-sm text-slate-600 dark:text-slate-300">Download the original to see its full layout and images.</p>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{preview.text}</div>
        {preview.truncated && <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">Download the original to read the rest of the document.</p>}
      </div>
    </article>
  );
}
