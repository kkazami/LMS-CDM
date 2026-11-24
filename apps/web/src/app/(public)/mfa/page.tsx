'use client';

import { useEffect, useState, type FormEvent } from 'react';

const primaryActionStyle = 'min-h-12 w-full rounded-lg bg-(--action-bg) px-4 py-3 text-sm font-semibold text-(--action-ink) enabled:hover:bg-(--action-hover) disabled:opacity-50';

export default function AdministratorMfaPage() {
  const [enrollment, setEnrollment] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState(''), [recovery, setRecovery] = useState(false);
  const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [readyToComplete, setReadyToComplete] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch('/api/auth/mfa', { cache: 'no-store' }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Sign in again to continue.');
      if (active) { setEnrollment(body.enrollment); setReadyToComplete(Boolean(body.verified && !body.enrollment)); if (body.recoveryAcknowledgmentRequired) setError('Recovery codes are shown only once. If you no longer have them, sign in again to restart enrollment.'); }
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Unable to load authenticator verification.'); });
    return () => { active = false; };
  }, []);
  async function submit(action: 'enroll' | 'verify' | 'acknowledge' | 'complete') {
    setError(''); setBusy(true);
    try {
      const response = await fetch('/api/auth/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'verify' ? { action, code, recovery } : action === 'acknowledge' ? { action, savedRecoveryCodes: saved } : { action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Verification failed.');
      if (body.complete && typeof body.redirect === 'string' && /^\/(?:ics|ibe|ite)\/(?:admin|academic-operations)$/.test(body.redirect)) { window.location.replace(body.redirect); return; }
      if (body.secret) setSetup({ secret: body.secret, qr: body.qr });
      if (body.recoveryCodes) { setCodes(body.recoveryCodes); setSetup(null); setCode(''); }
      if (body.verified) { setReadyToComplete(true); setCode(''); await submit('complete'); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Verification failed.'); }
    finally { setBusy(false); }
  }
  function verify(event: FormEvent) { event.preventDefault(); void submit('verify'); }
  async function cancel() {
    try { await fetch('/api/auth/mfa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) }); }
    finally { window.location.replace('/login?force=true'); }
  }
  return <main className="flex min-h-[85vh] items-center justify-center bg-(--bg-canvas) px-4 py-8 sm:px-6 sm:py-12">
    <section className="w-full min-w-0 max-w-lg rounded-2xl border border-(--border-color) bg-(--bg-surface) p-5 text-(--text-primary) sm:p-8" aria-busy={busy}>
      <h1 className="text-2xl font-semibold tracking-tight">{enrollment === null ? 'Administrator verification' : enrollment ? 'Set up your authenticator' : 'Verify your authenticator'}</h1>
      {enrollment !== null && <p className="mt-2 text-sm/6 text-(--text-secondary)">Your password has been checked. Administrator access starts only after this second step.</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {enrollment === null && !error && <p role="status" className="mt-2 text-sm/6 text-(--text-secondary)">Loading verification…</p>}
      {enrollment && !setup && !codes && <div className="mt-6">
        <button type="button" disabled={busy} onClick={() => void submit('enroll')} className={primaryActionStyle}>{busy ? 'Preparing setup…' : 'Set up authenticator app'}</button>
      </div>}
      {setup && <div className="mt-6 space-y-3">
        <p className="text-sm/6 text-(--text-secondary)">Scan this QR code in your authenticator app, or enter the setup key manually. Keep it private.</p>
        {/* The QR contains only this account's enrollment URI and is generated locally. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qr} alt="Authenticator enrollment QR code" width={240} height={240} className="mx-auto h-auto max-w-full rounded-lg bg-white" />
        <p className="break-all rounded-lg border border-(--border-color) bg-(--bg-canvas) p-3 font-mono text-sm">{setup.secret}</p>
      </div>}
      {readyToComplete && <div className="mt-6">
        <button type="button" disabled={busy} onClick={() => void submit('complete')} className={primaryActionStyle}>Continue secure sign-in</button>
      </div>}
      {enrollment !== null && (!enrollment || setup) && !codes && !readyToComplete && <form onSubmit={verify} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">{recovery ? 'Recovery code' : 'Six-digit authenticator code'}
          <input value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} maxLength={64} required disabled={busy} className="mt-2 block w-full rounded-lg border border-slate-400 bg-transparent px-3 py-3 text-base dark:border-slate-500" />
        </label>
        {!enrollment && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-(--action-bg)" checked={recovery} onChange={event => { setRecovery(event.target.checked); setCode(''); }} disabled={busy} />Use a single-use recovery code</label>}
        <button type="submit" disabled={busy} className={primaryActionStyle}>{busy ? 'Verifying…' : 'Verify code'}</button>
      </form>}
      {codes && <div className="mt-6 space-y-4">
        <h2 className="font-semibold">Save your recovery codes</h2>
        <p className="text-sm/6 text-(--text-secondary)">Each code works once if you lose access to your authenticator. Store these in a password manager or another private place. They will not be displayed again.</p>
        <pre className="overflow-x-auto rounded-lg border border-(--border-color) bg-(--bg-canvas) p-4 text-sm">{codes.join('\n')}</pre>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-(--action-bg)" checked={saved} onChange={event => setSaved(event.target.checked)} disabled={busy} />I saved my recovery codes.</label>
        <button type="button" disabled={!saved || busy} onClick={() => void submit('acknowledge')} className={primaryActionStyle}>Finish secure sign-in</button>
      </div>}
      <div className="mt-6 flex justify-center border-t border-(--border-color) pt-3">
        <button type="button" onClick={() => void cancel()} disabled={busy} className="min-h-11 rounded-md px-3 text-sm font-medium text-(--text-secondary) underline underline-offset-4 enabled:hover:text-(--text-primary) disabled:opacity-50">Return to sign-in</button>
      </div>
    </section>
  </main>;
}
