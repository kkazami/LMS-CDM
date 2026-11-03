"use client";

import { useEffect, useRef, useState } from 'react';
import { bannerCrop, moveBannerCrop } from '@/lib/banner-crop';

type Props = { file: File; onClose: () => void; onSave: (file: File) => Promise<boolean> };
export default function BannerCropModal({ file, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ pointer: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40000000) { setError('Choose an image smaller than 40 megapixels.'); return; }
      image.current = img; setReady(true);
    };
    img.onerror = () => setError('This image could not be opened. Choose another image.');
    img.src = url;
    return () => { img.onload = null; img.onerror = null; URL.revokeObjectURL(url); document.body.style.overflow = previous; };
  }, [file]);
  useEffect(() => {
    const img = image.current, ctx = canvas.current?.getContext('2d');
    if (!ready || !img || !ctx) return;
    const crop = bannerCrop(img.naturalWidth, img.naturalHeight, zoom, x, y);
    ctx.clearRect(0, 0, 1200, 300);
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, 1200, 300);
  }, [ready, zoom, x, y]);
  const img = image.current;
  const crop = img ? bannerCrop(img.naturalWidth, img.naturalHeight, zoom, x, y) : null;
  async function save() {
    if (!canvas.current || !ready) return;
    setBusy(true); setError('');
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.current!.toBlob(value => value ? resolve(value) : reject(new Error('Could not crop image.')), 'image/png'));
      if (await onSave(new File([blob], 'profile-banner.png', { type: 'image/png' }))) onClose();
      else setError('Upload failed. Your crop is still here; try again.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save banner.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="banner-crop-title" aria-describedby="banner-crop-help" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <h2 id="banner-crop-title" className="text-lg font-bold">Crop banner image</h2>
    <p id="banner-crop-help" className="mt-2 text-sm text-slate-500">Drag the picture to position it. The clear area inside the frame will be your banner; the shaded areas will be left out. Use the arrow keys to move it with a keyboard.</p>
    <div role="group" aria-label="Position banner image" aria-disabled={!ready || busy} tabIndex={0}
      onKeyDown={event => {
        if (!ready || busy || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') setX(value => Math.min(1, value + 0.03));
        if (event.key === 'ArrowRight') setX(value => Math.max(0, value - 0.03));
        if (event.key === 'ArrowUp') setY(value => Math.min(1, value + 0.03));
        if (event.key === 'ArrowDown') setY(value => Math.max(0, value - 0.03));
      }}
      onPointerDown={event => {
        if (!ready || busy || !event.isPrimary || event.button !== 0) return;
        event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x, y }; setDragging(true);
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId || !img) return;
        const next = moveBannerCrop(img.naturalWidth, img.naturalHeight, zoom, current.x, current.y, event.clientX - current.startX, event.clientY - current.startY, event.currentTarget.getBoundingClientRect().width);
        setX(next.x); setY(next.y);
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      className={`relative my-5 aspect-[2/1] w-full touch-none select-none overflow-hidden rounded-lg bg-slate-100 outline-offset-4 focus-visible:outline-2 dark:bg-slate-800 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
      {ready && img && crop && <img src={img.src} alt="Image being positioned for the banner" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: `${img.naturalWidth / crop.width * 100}%`, height: 'auto', left: `${-crop.x / crop.width * 100}%`, top: `${25 - crop.y / crop.height * 50}%` }} />}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/4 h-1/2 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-y-0 left-1/3 border-l border-white/30" /><div className="absolute inset-y-0 left-2/3 border-l border-white/30" />
      </div>
    </div>
    <canvas ref={canvas} width={1200} height={300} hidden />
    <fieldset disabled={!ready || busy} className="space-y-4">
      <label className="block text-sm">Zoom<input aria-label="Banner zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="mt-2 block w-full" /></label>
    </fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm">Cancel</button><button type="button" disabled={!ready || busy} onClick={() => void save()} className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900">{busy ? 'Saving crop…' : 'Save crop'}</button></div>
  </dialog>;
}
