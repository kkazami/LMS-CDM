'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StartForm({ courseId, formId, institute, title, hasPassword }: { courseId: string; formId: string; institute: string; title: string; hasPassword: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#12151E]">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Your attempt and timer will start when you continue.</p>
    <form method="post" className="mt-6 grid gap-4" onSubmit={async event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setBusy(true); setError('');
      try {
        const response = await fetch(`/api/courses/${courseId}/forms/${formId}/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: data.get('password') || '' }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to start this form.');
        router.refresh();
      } catch (error) { setError(error instanceof Error ? error.message : 'Unable to start this form.'); setBusy(false); }
    }}>
      {hasPassword && <label className="grid gap-2 text-sm font-medium">Form password<input name="password" type="password" required autoComplete="off" disabled={!ready || busy} className="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-white/20" /></label>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button disabled={!ready || busy} className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-50 dark:bg-slate-700">{busy ? 'Starting…' : 'Start assessment'}</button>
      <Link className="text-center text-sm underline" href={`/${institute}/courses/${courseId}/classwork`}>Back to classwork</Link>
    </form>
  </section>;
}
