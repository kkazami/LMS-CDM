'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { analyticsFilterAction, analyticsFilterHref, type AnalyticsFilterValues as Filters } from '../domain/analytics-filters';
type Props = {
  courses: { id: string; code: string; title: string }[];
  applied: Filters;
  defaults: { from: string; to: string };
};

export function AnalyticsFilters({ courses, applied, defaults }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(applied);
  const [pending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function navigate(filters: Filters) {
    startTransition(() => router.replace(analyticsFilterHref(filters, defaults), { scroll: false }));
  }

  function search(value: string) {
    setDraft(current => ({ ...current, search: value }));
    if (timer.current) clearTimeout(timer.current);
    setWaiting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setWaiting(false);
      navigate({ ...appliedRef.current, search: value });
    }, 350);
  }

  const action = analyticsFilterAction(draft, applied, defaults);
  const clear = action === 'clear';

  return <form className="ohm-actions ohm-analytics-filters" aria-label="Student filters" aria-busy={pending || waiting} onSubmit={event => {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setWaiting(false);
    if (clear) {
      const reset = { courseId: '', search: '', ...defaults };
      setDraft(reset);
      navigate(reset);
    } else navigate(draft);
  }}>
    <label className="ohm-field">Class<select name="courseId" value={draft.courseId} onChange={event => setDraft(current => ({ ...current, courseId: event.target.value }))}><option value="">All classes you can view</option>{courses.map(course => <option value={course.id} key={course.id}>{course.code} · {course.title}</option>)}</select></label>
    <label className="ohm-field">Find a student<input name="search" maxLength={100} value={draft.search} onChange={event => search(event.target.value)} placeholder="Name or student number" /></label>
    <label className="ohm-field">Activity start date<input type="date" name="from" min="2000-01-01" max="2100-12-31" value={draft.from} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} required /></label>
    <label className="ohm-field">Activity end date<input type="date" name="to" min="2000-01-01" max="2100-12-31" value={draft.to} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} required /></label>
    <button data-ohm-tour="analytics-filters" className="ohm-button" type="submit" formNoValidate={clear} disabled={pending || action === 'none'}>{clear ? 'Clear filters' : 'Apply filters'}</button>
    <p className="ohm-muted" role="status" aria-live="polite">{waiting || pending ? 'Updating results…' : 'Search updates as you type. Class and date changes use Apply filters.'}</p>
  </form>;
}
