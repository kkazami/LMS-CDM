'use client';
import { useEffect, useState } from 'react';
type Course = { id: string; title: string | null; code?: string; instructor: { id: string; name: string | null } | null; schedule?: { id: string; title: string; eventDate: string; eventType: string }[]; materials?: { id: string; title: string }[] };
export default function InstituteCourseList({ institute, courseId, administrative = false }: { institute: string; courseId?: string; administrative?: boolean }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState('Loading academic oversight…');
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const url = administrative ? `/api/courses${courseId ? '/' + encodeURIComponent(courseId) : ''}?institute=${institute}${courseId ? '' : '&page=' + page}` : `/api/academic-oversight/${institute}/courses${courseId ? '/' + encodeURIComponent(courseId) : ''}`;
    void fetch(url, { cache: 'no-store', signal: abort.signal })
      .then(async response => { const body = await response.json(); if (abort.signal.aborted) return; if (!response.ok) { setCourses([]); setMessage(body.error?.message ?? body.message ?? 'Academic oversight unavailable.'); return; }
        setCourses(courseId ? [body.course] : body.courses); setHasMore(body.pagination?.hasMore ?? false); setMessage(''); })
      .catch(() => { if (!abort.signal.aborted) { setCourses([]); setMessage('Academic oversight unavailable. Refresh to try again.'); } });
    return () => abort.abort();
  }, [institute, courseId, administrative, page]);
  return <section aria-labelledby="oversight-title" data-testid={administrative ? 'institute-course-region' : 'academic-oversight-region'}><h1 id="oversight-title" className="text-3xl font-semibold">{administrative ? 'Institute courses' : courseId ? 'Course supervision' : 'Course oversight'}</h1><p className="mt-2 text-slate-600">{administrative ? 'Institute-scoped course directory' : 'Read-only academic oversight'} · {institute.toUpperCase()}</p><p role="status" className="my-6 text-sm">{message}</p>
    {!courses.length && !message && <p>No active courses in this institute.</p>}
    <div className="divide-y rounded border bg-white">{courses.map(course => <article key={course.id} className="p-6"><p className="text-xs uppercase tracking-wide text-slate-500">{course.code}</p><h2 className="mt-1 text-xl font-semibold">{courseId ? course.title ?? 'Course metadata withheld' : <a className="underline" href={administrative ? `/${institute}/institute-administration/courses/${encodeURIComponent(course.id)}` : `/${institute}/academic-operations/courses/${encodeURIComponent(course.id)}/supervision`}>{course.title ?? 'Course metadata withheld'}</a>}</h2><p className="mt-2 text-sm text-slate-600">{course.instructor ? course.instructor.name ?? 'Instructor metadata withheld' : 'No assigned instructor'}</p>
      {courseId && !administrative && <><h3 className="mt-6 font-semibold">Course schedule</h3><ul>{course.schedule?.map(event => <li key={event.id} className="mt-2 text-sm">{event.title} · <time dateTime={event.eventDate}>{new Date(event.eventDate).toLocaleDateString()}</time></li>)}</ul><h3 className="mt-6 font-semibold">Learning materials</h3><ul>{course.materials?.map(material => <li key={material.id} className="mt-2 text-sm">{material.title}</li>)}</ul></>}
    </article>)}</div>
    {administrative && !courseId && <nav aria-label="Course pages" className="mt-5 flex items-center gap-4"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded border px-4 py-2 disabled:opacity-50">Previous</button><span>Page {page}</span><button disabled={!hasMore} onClick={() => setPage(value => value + 1)} className="rounded border px-4 py-2 disabled:opacity-50">Next</button></nav>}
  </section>;
}
