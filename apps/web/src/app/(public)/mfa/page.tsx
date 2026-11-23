'use client';

import { useEffect, useState, type FormEvent } from 'react';

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
  return <main className="min-h-[85vh] flex items-center justify-center bg-slate-50 px-5 py-12 dark:bg-slate-950">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-busy={busy}>
      <p className="mb-2 text-sm font-medium text-orange-600">Administrator security</p>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{enrollment ? 'Set up your authenticator' : 'Verify your authenticator'}</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Your password has been checked. Administrator access starts only after this second step.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {enrollment === null && !error && <p className="mt-5 text-sm">Loading verification…</p>}
      {enrollment && !setup && !codes && <button disabled={busy} onClick={() => void submit('enroll')} className="mt-6 rounded-lg bg-orange-600 px-4 py-3 font-medium text-white disabled:opacity-50">Set up authenticator app</button>}
      {setup && <div className="mt-5 space-y-3">
        <p className="text-sm">Scan this QR code in your authenticator app, or enter the setup key manually. Keep it private.</p>
        {/* The QR contains only this account's enrollment URI and is generated locally. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qr} alt="Authenticator enrollment QR code" width={240} height={240} className="rounded-lg" />
        <p className="break-all rounded-lg bg-slate-100 p-3 font-mono text-sm text-slate-900">{setup.secret}</p>
      </div>}
      {readyToComplete && <button disabled={busy} onClick={() => void submit('complete')} className="mt-6 rounded-lg bg-orange-600 px-4 py-3 font-medium text-white disabled:opacity-50">Continue secure sign-in</button>}
      {enrollment !== null && (!enrollment || setup) && !codes && !readyToComplete && <form onSubmit={verify} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">{recovery ? 'Recovery code' : 'Six-digit authenticator code'}
          <input value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} maxLength={64} required disabled={busy} className="mt-2 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-3 dark:border-slate-600" />
        </label>
        {!enrollment && <label className="flex gap-2 text-sm"><input type="checkbox" checked={recovery} onChange={event => { setRecovery(event.target.checked); setCode(''); }} disabled={busy} />Use a single-use recovery code</label>}
        <button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-3 font-medium text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify code'}</button>
      </form>}
      {codes && <div className="mt-5 space-y-4">
        <h2 className="font-semibold">Save your recovery codes</h2>
        <p className="text-sm">Each code works once if you lose access to your authenticator. Store these in a password manager or another private place. They will not be displayed again.</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-100 p-4 text-sm text-slate-900">{codes.join('\n')}</pre>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} disabled={busy} />I saved my recovery codes.</label>
        <button disabled={!saved || busy} onClick={() => void submit('acknowledge')} className="rounded-lg bg-orange-600 px-4 py-3 font-medium text-white disabled:opacity-50">Finish secure sign-in</button>
      </div>}
      <button type="button" onClick={() => void cancel()} disabled={busy} className="mt-6 inline-block text-sm underline">Return to sign-in</button>
    </section>
  </main>;
}
