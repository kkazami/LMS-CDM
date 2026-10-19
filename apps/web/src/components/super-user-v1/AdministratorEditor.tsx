'use client';

import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { requestError, type InstituteAdmin } from './use-super-user-data';
import styles from './super-user.module.css';

export default function AdministratorEditor({ account, institute, onSaved, onBusyChange }: {
  account: InstituteAdmin; institute: string; onSaved: (sessionsEnded: boolean) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const newPassword = String(values.get('newPassword') ?? '');
    if (newPassword !== values.get('confirmPassword')) { setError('The new passwords do not match.'); return; }
    setBusy(true); onBusyChange(true); setError('');
    try {
      const response = await fetch(`/api/super-user/${institute}/institute-admins/${encodeURIComponent(account.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.get('name'), email: values.get('email'), currentPassword: values.get('currentPassword'), ...(newPassword ? { newPassword } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) { setError(requestError(response.status, body.error?.message)); return; }
      form.reset(); onSaved(body.sessionsEnded);
    } catch { setError('Could not confirm the update. Refresh this account before trying again.'); }
    finally { setBusy(false); onBusyChange(false); }
  }

  return <form onSubmit={save} className={`${styles.panel} ${styles.form}`} aria-labelledby="edit-administrator-title">
    <h2 id="edit-administrator-title">Edit administrator</h2>
    <p>Update their name or sign-in email. Leave the new password blank to keep the current one. Changing the email or password signs this administrator out of the LMS.</p>
    <fieldset disabled={busy} className={styles.editorFields}>
      <label>Full name<input name="name" defaultValue={account.name} required minLength={2} maxLength={100} className={styles.field} /></label>
      <label>Sign-in email<input name="email" type="email" defaultValue={account.email} required maxLength={254} className={styles.field} /></label>
      <label>New password <span className={styles.optional}>Optional</span><input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" className={styles.field} aria-describedby="administrator-password-help" /></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" maxLength={72} className={styles.field} /></label>
      <p id="administrator-password-help" className={styles.editorHelp}>Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number. Passwords are never displayed.</p>
      <label>Your Super User password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} className={styles.field} /></label>
      <div className={styles.editorActions}><button className={styles.primaryButton} disabled={busy}><Save size={16} aria-hidden="true" />{busy ? 'Saving…' : 'Save changes'}</button></div>
    </fieldset>
    {error && <p className={styles.editorError} role="alert">{error}</p>}
  </form>;
}
