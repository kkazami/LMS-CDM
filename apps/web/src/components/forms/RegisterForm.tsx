'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PolicyLink } from '@/components/legal/PolicyNavigation';
import { syncSessionToNative } from '@/lib/mobile-bridge';
import GoogleSignIn from './GoogleSignIn';
import styles from './StudentAccess.module.css';

type Props = { instituteCode: string; googleEnabled: boolean; googleProfile: { name: string; email: string } | null; linking: boolean; studentNumber?: string };
export default function RegisterForm({ instituteCode, googleEnabled, googleProfile, linking, studentNumber = '' }: Props) {
  const [institute, setInstitute] = useState(instituteCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(form), instituteCode: institute, google: Boolean(googleProfile), acceptedPolicies: form.get('acceptedPolicies') === 'on' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to register. Please try again.');
      syncSessionToNative(data.token, data.user);
      window.location.assign(data.redirectTo);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to register.'); setBusy(false); }
  }
  return <>
    <h1>{linking ? 'Connect your Google account' : googleProfile ? 'Complete your student account' : 'Create your student account'}</h1>
    <p>{linking ? 'Confirm your existing student ID and password to connect Google. Your institute stays the same.' : 'Choose your institute. After registration, enter a class code from your instructor to unlock your learning space.'}</p>
    <form onSubmit={submit} className={styles.form} aria-busy={busy}>
      <label className={styles.field}>Institute<select name="instituteCode" value={institute} onChange={event => setInstitute(event.target.value)} disabled={busy || linking} required><option value="ics">ICS — Institute of Computing Studies</option><option value="ite">ITE — Institute of Teacher Education</option><option value="ibe">IBE — Institute of Business and Entrepreneurship</option></select></label>
      <label className={styles.field}>Full name<input name="name" autoComplete="name" defaultValue={googleProfile?.name} minLength={2} maxLength={150} required disabled={busy} /></label>
      <div className={styles.field}><label htmlFor="register-student-id">Student ID</label><input id="register-student-id" name="studentNumber" aria-describedby="student-id-hint" autoComplete="off" placeholder="26-12345" defaultValue={studentNumber} pattern={linking ? undefined : "[0-9]{2}-[0-9]{5}"} maxLength={linking ? 40 : 8} title="Two digits, a hyphen, then five digits (26-12345)" required disabled={busy} /><span id="student-id-hint" className={styles.hint}>{linking ? 'Use the student ID on your existing account.' : 'Format: XX-XXXXX. Use the ID issued by your school.'}</span></div>
      <label className={styles.field}>Email<input name="email" type="email" autoComplete="email" defaultValue={googleProfile?.email} readOnly={Boolean(googleProfile)} maxLength={254} required disabled={busy} /></label>
      <div className={styles.field}><label htmlFor="register-password">{linking ? 'Existing password' : 'Password'}</label><input id="register-password" name="password" aria-describedby="password-hint" type="password" autoComplete={linking ? 'current-password' : 'new-password'} minLength={linking ? 1 : 8} required disabled={busy} /><span id="password-hint" className={styles.hint}>{linking ? 'Enter your current LMS password to verify account ownership.' : 'At least 8 characters, including uppercase, lowercase, and a number.'}</span></div>
      <label className={styles.field}>Confirm password<input name="confirmPassword" type="password" autoComplete={linking ? "current-password" : "new-password"} minLength={linking ? 1 : 8} required disabled={busy} /></label>
      <label className={styles.consent}><input type="checkbox" name="acceptedPolicies" required disabled={busy} /><span>I agree to the <PolicyLink href="/terms">Terms and Conditions</PolicyLink> and acknowledge the <PolicyLink href="/privacy">Privacy Policy</PolicyLink>.</span></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.button} disabled={busy}>{busy ? 'Saving your account…' : linking ? 'Connect Google and sign in' : 'Create account'}</button>
    </form>
    {!googleProfile && googleEnabled && <div className={styles.footer}><GoogleSignIn instituteCode={institute} /></div>}
    <div className={styles.footer}><Link href={`/login?institute=${institute}`}>Already have an account? Sign in</Link></div>
  </>;
}
