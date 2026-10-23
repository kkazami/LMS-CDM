"use client";
import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import styles from './login.module.css';

type Props = {
  instituteCode: string;
  acceptedPolicies: boolean;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
};

export default function GoogleSignIn({ instituteCode, acceptedPolicies, disabled, onBusyChange, onError }: Props) {
  const [busy, setBusy] = useState(false);
  async function connect() {
    onError('');
    if (!acceptedPolicies) {
      onError('Agree to the Terms and Conditions and acknowledge the Privacy Policy to continue with Google.');
      return;
    }
    const body = new FormData();
    body.set('instituteCode', instituteCode);
    body.set('acceptedPolicies', 'true');
    setBusy(true);
    onBusyChange(true);
    try {
      const response = await fetch('/api/auth/google', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to connect to Google. Try again.');
      window.location.assign(result.url);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to connect to Google.');
      setBusy(false);
      onBusyChange(false);
    }
  }
  return <button type="button" className={`${styles.submit} ${styles.googleButton}`} disabled={disabled || busy} onClick={connect}>
    {busy && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
    {busy ? 'Connecting to Google…' : 'Continue with Google'}
  </button>;
}
