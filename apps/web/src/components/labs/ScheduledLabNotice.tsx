'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';

function scheduleDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function ScheduledLabNotice({ courseId, title, opensAt, dueDate }: { courseId: string; title: string; opensAt: string; dueDate: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
    <Link href={`/ics/courses/${courseId}/classwork`} className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ArrowLeft size={16}/>Back to Classwork</Link>
    <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm dark:border-orange-900 dark:bg-slate-900 sm:p-9">
      <div className="mb-5 inline-flex rounded-2xl bg-orange-50 p-3 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><Clock size={28} aria-hidden="true"/></div>
      <p className="text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-300">Scheduled practical lab</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <h2 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">This lab opens on <time dateTime={opensAt}>{scheduleDate(opensAt)}</time>.</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Philippine time (UTC+8)</p>
      <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">You can view the instructions, start your work, and upload evidence once the lab opens. This page will update automatically.</p>
      {dueDate && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Due: <time dateTime={dueDate}>{scheduleDate(dueDate)}</time> (Philippine time)</p>}
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} className={pending ? 'animate-spin' : ''}/>{pending ? 'Checking…' : 'Check availability'}</button>
    </div>
  </section>;
}
