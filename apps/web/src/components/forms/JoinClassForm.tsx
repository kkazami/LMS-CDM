'use client';
import { useState } from 'react';
import styles from './StudentAccess.module.css';

export default function JoinClassForm() {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function join(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/student/join-class', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to join this class.');
      window.location.assign(data.redirectTo);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to join this class.'); setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to sign out. Try again.');
      window.location.assign('/login?force=true');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign out.'); setBusy(false); }
  }
  return <form className={styles.form} onSubmit={join} aria-busy={busy}>
    <div className={styles.field}><label htmlFor="class-code">Class code</label><input id="class-code" name="code" aria-describedby="class-code-hint" autoComplete="off" autoCapitalize="characters" value={code} onChange={event => setCode(event.target.value)} minLength={4} maxLength={32} required disabled={busy} /><span id="class-code-hint" className={styles.hint}>Ask your instructor for your institute’s class code.</span></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button className={styles.button} disabled={busy}>{busy ? 'Please wait…' : 'Join class and continue'}</button>
    <button className={styles.secondary} type="button" onClick={logout} disabled={busy}>Sign out</button>
  </form>;
}
