'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, FileText, LockKeyhole, Megaphone, RefreshCw, Search } from 'lucide-react';
import { Loading, LoadError } from './SuperUserOverview';
import { useSuperUserData, type CourseResponse, type AcademicCourse } from './use-super-user-data';
import styles from './super-user.module.css';

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

export default function InstituteCourseList({ institute, courseId, administrative = false, initialAssignment = 'all' }: { institute: string; courseId?: string; administrative?: boolean; initialAssignment?: 'all' | 'unassigned' }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [assignment, setAssignment] = useState<string>(initialAssignment);
  const [sort, setSort] = useState('title');
  const endpoint = administrative ? `/api/courses${courseId ? '/' + encodeURIComponent(courseId) : ''}?institute=${institute}${courseId ? '' : '&page=' + page}` : `/api/academic-oversight/${institute}/courses${courseId ? '/' + encodeURIComponent(courseId) : ''}`;
  const { data, loading, error, reload } = useSuperUserData<CourseResponse>(endpoint);
  const courses = data ? courseId ? [data.course] : data.courses : [];
  const search = query.trim().toLowerCase();
  const filtered = courses.filter(course => [course.title, course.code, course.section, course.subject, course.room, course.instructor?.name].some(value => value?.toLowerCase().includes(search)) && (assignment !== 'unassigned' || !course.instructor)).sort((a, b) => (sort === 'instructor' ? a.instructor?.name ?? '' : a.title ?? '').localeCompare(sort === 'instructor' ? b.instructor?.name ?? '' : b.title ?? ''));
  const base = `/${institute}/${administrative ? 'institute-administration' : 'academic-operations'}/courses`;
  const course = courseId ? courses[0] : null;
  const href = (id: string) => `${base}/${encodeURIComponent(id)}${administrative ? '' : '/supervision'}`;

  return <section aria-labelledby="oversight-title" data-testid={administrative ? 'institute-course-region' : 'academic-oversight-region'}>
    {courseId && <Link className={styles.backLink} href={base}><ArrowLeft size={15} aria-hidden="true" />Back to courses</Link>}
    <header className={styles.pageHeader}><div><h1 id="oversight-title">{courseId ? course?.title || 'Course details' : administrative ? 'Institute courses' : 'Courses'}</h1><p>{courseId ? `Schedule, learning materials, and announcements for this ${institute.toUpperCase()} course.` : `Browse active ${institute.toUpperCase()} courses and check instructor assignments.`}</p></div><button className={styles.button} onClick={reload} disabled={loading}><RefreshCw size={15} aria-hidden="true" />Refresh</button></header>
    {loading ? <div className={styles.panel}><Loading label="Loading courses" /></div> : error ? <div className={styles.panel}><LoadError message={error} retry={reload} /></div> : course ? <CourseDetails course={course} administrative={administrative} /> : <>
      {!administrative && <div className={styles.notice}><LockKeyhole size={17} aria-hidden="true" /><p>Course information is read-only. Instructors and institute administrators manage course changes.</p></div>}
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search courses</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search course, instructor, or section" /></label>
        <select className={styles.select} aria-label="Instructor assignment" value={assignment} onChange={event => setAssignment(event.target.value)}><option value="all">All assignments</option><option value="unassigned">No assigned instructor</option></select>
        <select className={styles.select} aria-label="Sort courses" value={sort} onChange={event => setSort(event.target.value)}><option value="title">Course name A–Z</option><option value="instructor">Instructor A–Z</option></select>
      </div>
      <div className={styles.panel}>
        {filtered.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Course directory"><table className={styles.table}><caption className={styles.srOnly}>Active courses in {institute.toUpperCase()}</caption><thead><tr><th scope="col">Course</th><th scope="col">Instructor</th><th scope="col">Section / Room</th><th scope="col"><span className={styles.srOnly}>Details</span></th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><Link href={href(item.id)}>{item.title || 'Untitled course'}</Link><small>{[item.code, item.subject].filter(Boolean).join(' · ') || 'No course code provided'}</small></td><td>{item.instructor ? item.instructor.name || 'Name unavailable' : <span className={styles.badge}>Unassigned</span>}</td><td>{item.section || 'No section'}<small>{item.room || 'No room listed'}</small></td><td><Link href={href(item.id)} aria-label={`View ${item.title || 'course'} details`}><ArrowRight size={18} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div> : <div className={styles.empty}><BookOpen size={28} aria-hidden="true" /><h2>{courses.length ? 'No matching courses' : 'No active courses'}</h2><p>{courses.length ? 'Try another name or clear the filters to see every course.' : 'Courses will appear here when they are created in this institute.'}</p>{courses.length > 0 && <button className={styles.button} onClick={() => { setQuery(''); setAssignment('all'); }}>Clear filters</button>}</div>}
        <p className={styles.tableFooter} role="status">Showing {filtered.length} of {courses.length} {courses.length === 1 ? 'course' : 'courses'}{administrative ? ' on this page' : ''}</p>
      </div>
      {administrative && <nav aria-label="Course pages" className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className={styles.button}>Previous</button><span>Page {page}</span><button disabled={!data?.pagination?.hasMore} onClick={() => setPage(value => value + 1)} className={styles.button}>Next</button></nav>}
    </>}
  </section>;
}

function CourseDetails({ course, administrative }: { course: AcademicCourse; administrative: boolean }) {
  return <>
    <section className={styles.panel} aria-label="Course information"><dl className={styles.detailMeta}>
      <div><dt>Instructor</dt><dd>{course.instructor?.name || 'No assigned instructor'}</dd></div><div><dt>Course code</dt><dd>{course.code || 'Not provided'}</dd></div><div><dt>Section</dt><dd>{course.section || 'Not provided'}</dd></div><div><dt>Room</dt><dd>{course.room || 'Not provided'}</dd></div>
      {course.subject && <div><dt>Subject</dt><dd>{course.subject}</dd></div>}
    </dl></section>
    {!administrative && <>
      <div className={styles.detailGrid}>
        <section className={styles.panel}><div className={styles.panelHeading}><h2>Course schedule</h2><CalendarDays size={19} aria-hidden="true" /></div>{course.schedule?.length ? [...course.schedule].sort((a, b) => a.eventDate.localeCompare(b.eventDate)).map(event => <div className={styles.listRow} key={event.id}><div><strong>{event.title}</strong><p>{event.eventType.replaceAll('_', ' ').toLowerCase()}</p></div><time className={styles.date} dateTime={event.eventDate}>{formatDate(event.eventDate)}</time></div>) : <p className={styles.note}>No scheduled events have been added to this course.</p>}</section>
        <section className={styles.panel}><div className={styles.panelHeading}><h2>Learning materials</h2><FileText size={19} aria-hidden="true" /></div>{course.materials?.length ? course.materials.map(material => <div className={styles.listRow} key={material.id}><strong>{material.title}</strong><span className={styles.badge}>Material</span></div>) : <p className={styles.note}>No learning materials have been added yet.</p>}</section>
        <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Announcements</h2><p>{course.announcements?.length ?? 0} posted. This view shows posting dates only.</p></div><Megaphone size={19} aria-hidden="true" /></div>{course.announcements?.length ? [...course.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(item => <div key={item.id} className={styles.listRow}><strong>Course announcement</strong><time className={styles.date} dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>) : <p className={styles.note}>No announcements have been posted yet.</p>}</section>
      </div>
      <p className={styles.note}>Student records, grades, and assessment results are not included in this view.</p>
    </>}
  </>;
}
