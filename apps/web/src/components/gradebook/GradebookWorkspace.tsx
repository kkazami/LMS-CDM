'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GradebookTable from './GradebookTable';
import type { GradebookData } from '@/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions';

type Course = { id: string; title: string; code: string; section: string; isArchived: boolean };
export default function GradebookWorkspace({ courses, courseId, data, instituteCode, initialPeriod, problem }: { courses: Course[]; courseId?: string; data?: GradebookData; instituteCode: string; initialPeriod?: string; problem?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selected = courses.find(course => course.id === courseId);
  return <section className="min-w-0 space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">Gradebooks</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Switch classes, enter period scores, and calculate each student's Final Grade.</p></div><label className="grid min-w-64 max-w-full gap-2 text-sm font-medium">Class<select disabled={pending || !courses.length} className="max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white dark:[&>option]:bg-slate-900" value={courseId ?? ''} onChange={event => { const id = event.target.value; startTransition(() => router.push(`/${instituteCode}/gradebooks?course=${encodeURIComponent(id)}`)); }}>{courses.map(course => <option key={course.id} value={course.id}>{course.code}{course.section ? ' · ' + course.section : ''} — {course.title}{course.isArchived ? ' (Archived)' : ''}</option>)}</select></label></header>
    {pending && <p role="status" className="text-sm">Loading class gradebook…</p>}
    {!courses.length && <p className="rounded-xl border border-slate-200 p-8 text-sm dark:border-slate-700">Your assigned classes will appear here. <Link className="underline" href={`/${instituteCode}/courses`}>View classes</Link></p>}
    {problem && courseId && <section role="alert" className="space-y-3 rounded-xl bg-amber-50 p-5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"><p>{problem}</p><Link className="mr-4 underline" href={`/${instituteCode}/gradebooks?course=${encodeURIComponent(courseId)}`}>First page</Link><a className="underline" href={`/api/courses/${courseId}/gradebook/export`}>Export complete CSV</a></section>}
    {data && selected && <GradebookTable key={`${selected.id}:${data.pagination.page}`} data={data} courseId={selected.id} courseTitle={selected.title} instituteCode={instituteCode} standalone initialPeriod={initialPeriod}/>}
  </section>;
}
