'use client';
import { useEffect, useRef, useState } from 'react';

export default function AttendanceScanner({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onScan); callback.current = onScan;
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false; let scanner: import('qr-scanner').default | undefined;
    const previous = document.activeElement;
    dialog.current?.showModal();
    void import('qr-scanner').then(async ({ default: QrScanner }) => {
      if (disposed || !video.current) return;
      scanner = new QrScanner(video.current, result => { scanner?.stop(); callback.current(result.data); }, { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true });
      try { await scanner.start(); if (disposed) scanner.destroy(); }
      catch { if (!disposed) setError('Camera unavailable. Close this window and request instructor approval instead.'); }
    }).catch(() => { if (!disposed) setError('The scanner could not load. Close and retry, or request instructor approval.'); });
    const stopHidden = () => { if (document.hidden) scanner?.stop(); else if (!disposed) void scanner?.start().catch(() => setError('Camera unavailable. Please close and retry.')); };
    document.addEventListener('visibilitychange', stopHidden);
    return () => { disposed = true; scanner?.destroy(); document.removeEventListener('visibilitychange', stopHidden); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="attendance-scanner-title" onCancel={onClose} className="w-[min(92vw,480px)] rounded-2xl border border-slate-300 bg-[var(--bg-surface)] p-5 text-[var(--text-primary)] backdrop:bg-black/60">
    <h2 id="attendance-scanner-title" className="text-lg font-bold">Scan attendance QR</h2>
    <p className="my-3 text-sm">Point your camera at the current QR shown by your instructor.</p>
    <video ref={video} muted playsInline className="aspect-square w-full rounded-xl bg-black object-cover" />
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full rounded-xl border border-[var(--border-color)] px-4">Close scanner</button>
  </dialog>;
}
