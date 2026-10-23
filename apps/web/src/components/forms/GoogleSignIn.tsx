'use client';
import { useState } from 'react';
import { PolicyLink } from '@/components/legal/PolicyNavigation';
import styles from './StudentAccess.module.css';

export default function GoogleSignIn({ instituteCode }: { instituteCode: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/google', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to connect to Google. Try again.');
      window.location.assign(result.url);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to connect to Google.'); setBusy(false); }
  }
  return <form className={styles.google} onSubmit={submit}>
    <input type="hidden" name="instituteCode" value={instituteCode} />
    <label className={styles.consent}>
      <input type="checkbox" name="acceptedPolicies" value="true" required disabled={busy} />
      <span>I agree to the <PolicyLink href="/terms">Terms and Conditions</PolicyLink> and acknowledge the <PolicyLink href="/privacy">Privacy Policy</PolicyLink> for Google sign-in.</span>
    </label>
    <button className={styles.secondary} disabled={busy}>{busy ? 'Connecting to Google…' : 'Continue with Google'}</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
