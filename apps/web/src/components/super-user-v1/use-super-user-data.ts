'use client';

import { useEffect, useState } from 'react';

export type AcademicCourse = {
  id: string; title: string | null; code?: string; section?: string; subject?: string; room?: string;
  instructor: { id: string; name: string | null } | null;
  schedule?: { id: string; title: string; eventDate: string; eventType: string }[];
  materials?: { id: string; title: string }[];
  announcements?: { id: string; createdAt: string }[];
};
export type InstituteAdmin = { id: string; name: string; email: string; isActive: boolean; role: 'ADMIN'; createdAt: string; instituteCode: string };
export type CourseResponse = { courses: AcademicCourse[]; course: AcademicCourse; pagination?: { hasMore: boolean } };
export type AdminResponse = { instituteAdmins: InstituteAdmin[]; instituteAdmin: InstituteAdmin };

export function requestError(status: number, message?: string): string {
  if (message === 'REAUTH_FAILED') return 'Your current password is incorrect. Try again.';
  if (message === 'CREDENTIAL_SETUP_REQUIRED') return 'Password updates are awaiting database setup. You can save the profile with the new password fields left blank.';
  if (status === 401) return 'Your session has ended. Sign in again to continue.';
  if (status === 403) return 'You do not have access to this information.';
  if (status === 404) return 'This record is no longer available in this institute.';
  if (message === 'HANDOFF_INCOMPLETE') return 'This account needs its login details set up by the LMS administrator before it can be activated.';
  if (message === 'STATUS_CONFLICT') return 'This account has already changed. Refresh the list to see its current status.';
  if (status === 409) return 'An account with this email already exists.';
  if (status === 429) return 'Too many attempts. Wait 15 minutes before trying again.';
  if (status === 400 && message?.startsWith('Password must')) return message;
  if (status === 400) return 'Check the name and email address, then try again.';
  return 'We could not load this information. Try again in a moment.';
}

export function useSuperUserData<T>(url: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ url: string; data: T | null; loading: boolean; error: string }>({ url, data: null, loading: true, error: '' });
  useEffect(() => {
    const abort = new AbortController();
    setResult({ url, data: null, loading: true, error: '' });
    void (async () => {
      try {
        const response = await fetch(url, { cache: 'no-store', signal: abort.signal });
        const body = await response.json();
        if (abort.signal.aborted) return;
        setResult(response.ok ? { url, data: body, loading: false, error: '' } : { url, data: null, loading: false, error: requestError(response.status, body.error?.message ?? body.message) });
      } catch {
        if (!abort.signal.aborted) setResult({ url, data: null, loading: false, error: 'Could not connect to the LMS. Check your connection and try again.' });
      }
    })();
    return () => abort.abort();
  }, [url, attempt]);
  return { ...(result.url === url ? result : { data: null, loading: true, error: '' }), reload: () => setAttempt(value => value + 1) };
}
