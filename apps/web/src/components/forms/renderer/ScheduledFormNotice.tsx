'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { getInstituteTheme } from '@/lib/get-institute-theme';

const kinds: Record<string, string> = { QUIZ: 'quiz', ACTIVITY: 'activity', MIDTERM_EXAM: 'midterm exam', FINAL_EXAM: 'final exam' };
function date(value: string) { return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
export default function ScheduledFormNotice({ institute, courseId, title, formType, opensAt, closesAt }: {
  institute: string; courseId: string; title: string; formType: string; opensAt: string; closesAt: string | null;
}) {
  const router = useRouter(), [pending, startTransition] = useTransition();
  const kind = kinds[formType] ?? 'assessment', primary = getInstituteTheme(institute).colors.primary;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = new Date(opensAt).getTime() - Date.now();
      if (remaining <= 0) { router.refresh(); timer = setTimeout(check, 10000); }
      else timer = setTimeout(check, Math.min(remaining + 250, 60000));
    };
    const focus = () => { clearTimeout(timer); check(); };
    check(); window.addEventListener('focus', focus);
    return () => { clearTimeout(timer); window.removeEventListener('focus', focus); };
  }, [opensAt, router]);
  return <section className="mx-auto max-w-3xl space-y-6 pb-12">
    <Link href={`/${institute}/courses/${courseId}/classwork`} className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ArrowLeft size={16} />Back to Classwork</Link>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-9">
      <Clock size={30} style={{ color: primary }} aria-hidden="true" />
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest" style={{ color: primary }}>Scheduled {kind}</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">This {kind} opens on <time dateTime={opensAt}>{date(opensAt)}</time>.</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Philippine time (UTC+8)</p>
      <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">Questions and the start button will be available when it opens. Your attempt and timer will begin only when you choose Start assessment. This page checks availability automatically.</p>
      {closesAt && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Due: <time dateTime={closesAt}>{date(closesAt)}</time> (Philippine time)</p>}
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100"><RefreshCw size={16} className={pending ? 'animate-spin' : ''} />{pending ? 'Checking…' : 'Check availability'}</button>
    </div>
  </section>;
}
