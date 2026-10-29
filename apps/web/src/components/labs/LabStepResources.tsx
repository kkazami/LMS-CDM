'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Maximize2, Play, X } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { LAB_BUILTIN_IMAGES, labAssetId, publicReferenceLink, youtubeLink, type LabResource } from '@/lib/labs/resources';

export default function LabStepResources({ resources = [] }: { resources?: LabResource[] }) {
  const [expanded, setExpanded] = useState<LabResource | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);
  if (!resources.length) return null;
  const imageUrl = (resource: LabResource) => resource.url + (labAssetId(resource.url) ? '?inline=1' : '');
  return <section aria-label="Optional step help" className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
    <div><h4 className="text-sm font-semibold">Need a visual or example?</h4><p className="mt-1 text-xs text-slate-500">Optional help. Videos and guides open in a new tab so you can continue here.</p></div>
    {resources.slice(0, 4).map((resource, index) => {
      if (resource.type === 'IMAGE') {
        if (!labAssetId(resource.url) && !LAB_BUILTIN_IMAGES.some(url => url === resource.url)) return null;
        return <figure key={index} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {!failed.includes(resource.url) ? <button type="button" onClick={() => setExpanded(resource)} className="block w-full bg-slate-100 p-2 text-left focus-visible:outline-orange-600 dark:bg-slate-800" aria-label={'Enlarge screenshot: ' + resource.title}>
            <img src={imageUrl(resource)} alt={resource.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(current => [...current, resource.url])} className="mx-auto max-h-80 w-full object-contain" />
            <span className="mt-2 inline-flex min-h-9 items-center gap-2 text-xs"><Maximize2 size={14} />Enlarge screenshot</span>
          </button> : <p role="status" className="p-4 text-sm">Screenshot unavailable. Continue with the written steps, or ask your instructor for a replacement.</p>}
          <figcaption className="space-y-1 p-4 text-sm"><p className="font-medium">{resource.title}</p>{resource.caption && <p className="whitespace-pre-wrap text-slate-500">{resource.caption}</p>}</figcaption>
        </figure>;
      }
      const href = resource.type === 'YOUTUBE' ? youtubeLink(resource.url) : publicReferenceLink(resource.url) ? resource.url : null;
      if (!href) return null;
      return <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-orange-700 underline decoration-orange-300 underline-offset-4 focus-visible:outline-orange-600 dark:text-orange-300">
          {resource.type === 'YOUTUBE' ? <Play size={16} /> : <ExternalLink size={16} />}{resource.title}<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="text-xs text-slate-500">{resource.type === 'YOUTUBE' ? 'Watch on YouTube' : 'Open reference guide'}</p>
        {resource.caption && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{resource.caption}</p>}
      </div>;
    })}
    {expanded && createPortal(<div className="relative z-[130] [&_[role=dialog]]:max-h-[90dvh] [&_[role=dialog]]:max-w-5xl [&_[role=dialog]]:overflow-y-auto">
      <ConfirmDialog title={expanded.title} description={expanded.caption || 'Screenshot for this step.'} onClose={() => setExpanded(null)}>
        <img src={imageUrl(expanded)} alt={expanded.title} className="mx-auto max-h-[65dvh] w-full object-contain" />
        <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600" onClick={() => setExpanded(null)}><X size={16} />Close screenshot</button>
      </ConfirmDialog>
    </div>, document.body)}
  </section>;
}
