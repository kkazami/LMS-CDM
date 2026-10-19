'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, RefreshCw, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { useSuperUserData, type CourseResponse, type AdminResponse } from './use-super-user-data';
import styles from './super-user.module.css';
import AnimatedCount from './AnimatedCount';

export default function SuperUserOverview({ institute }: { institute: string }) {
  const courses = useSuperUserData<CourseResponse>(`/api/academic-oversight/${institute}/courses`);
  const admins = useSuperUserData<AdminResponse>(`/api/super-user/${institute}/institute-admins`);
  const courseList = courses.data?.courses ?? [];
  const accounts = admins.data?.instituteAdmins ?? [];
  const unassigned = courseList.filter(course => !course.instructor);
  const activeAdmins = accounts.filter(account => account.isActive).length;
  const instructors = new Set(courseList.flatMap(course => course.instructor ? [course.instructor.id] : [])).size;
  const base = `/${institute}/academic-operations`;
  const theme = getInstituteTheme(institute);

  return <section aria-labelledby="overview-title">
    <header className={styles.pageHeader}><div><h1 id="overview-title">Institute overview</h1><p>{theme.name}. Review current courses and check who has administrator access.</p></div><button className={styles.button} disabled={courses.loading || admins.loading} onClick={() => { courses.reload(); admins.reload(); }}><RefreshCw size={15} aria-hidden="true" />Refresh</button></header>
    <dl className={styles.metrics}>
      <div className={styles.metric}><dt>Active courses</dt><dd><AnimatedCount value={courses.data ? courseList.length : null} /></dd><p>{courses.loading ? 'Loading courses…' : courses.error ? 'Information unavailable' : 'Current institute courses'}</p></div>
      <div className={styles.metric}><dt>Assigned instructors</dt><dd><AnimatedCount value={courses.data ? instructors : null} /></dd><p>{courses.data ? `${unassigned.length} ${unassigned.length === 1 ? 'course needs' : 'courses need'} an instructor` : 'Across active courses'}</p></div>
      <div className={styles.metric}><dt>Active administrators</dt><dd><AnimatedCount value={admins.data ? activeAdmins : null} /></dd><p>{admins.loading ? 'Loading accounts…' : admins.error ? 'Information unavailable' : `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'} in this institute`}</p></div>
    </dl>
    {courses.data && unassigned.length > 0 && <div className={styles.notice} data-tone="warning"><TriangleAlert size={18} aria-hidden="true" /><p>{unassigned.length} {unassigned.length === 1 ? 'course has' : 'courses have'} no assigned instructor. Ask an institute administrator to check the assignments.</p><Link className={styles.textLink} href={`${base}/courses?assignment=unassigned`}>View courses</Link></div>}
    {admins.data && activeAdmins === 0 && <div className={styles.notice} data-tone="warning"><ShieldCheck size={18} aria-hidden="true" /><p>This institute has no active administrator. Review the accounts below or add an administrator.</p></div>}
    <div className={styles.overviewGrid}>
      <section className={styles.panel} aria-labelledby="overview-courses"><div className={styles.panelHeading}><div><h2 id="overview-courses">Courses</h2><p>Instructor assignments and course details.</p></div><Link className={styles.textLink} href={`${base}/courses`}>View all</Link></div>
        {courses.loading ? <Loading label="Loading courses" /> : courses.error ? <LoadError message={courses.error} retry={courses.reload} /> : courseList.length ? [...courseList].sort((a, b) => Number(Boolean(a.instructor)) - Number(Boolean(b.instructor)) || (a.title ?? '').localeCompare(b.title ?? '')).slice(0, 5).map(course => <Link className={styles.listRow} key={course.id} href={`${base}/courses/${encodeURIComponent(course.id)}/supervision`}><div><strong>{course.title || 'Untitled course'}</strong><p>{[course.code, course.section && `Section ${course.section}`, course.instructor?.name || 'No assigned instructor'].filter(Boolean).join(' · ')}</p></div><ArrowRight size={17} aria-hidden="true" /></Link>) : <div className={styles.empty}><BookOpen size={26} aria-hidden="true" /><h3>No active courses</h3><p>Courses created by this institute will appear here.</p></div>}
      </section>
      <section className={styles.panel} aria-labelledby="overview-admins"><div className={styles.panelHeading}><div><h2 id="overview-admins">Administrators</h2><p>Access to {institute.toUpperCase()} administration.</p></div><Link className={styles.textLink} href={`${base}/institute-admins`}>Manage</Link></div>
        {admins.loading ? <Loading label="Loading administrators" /> : admins.error ? <LoadError message={admins.error} retry={admins.reload} /> : accounts.length ? accounts.slice(0, 4).map(account => <Link className={styles.listRow} href={`${base}/institute-admins/${encodeURIComponent(account.id)}`} key={account.id}><div><strong>{account.name}</strong><p>{account.email}</p></div><span className={styles.badge} data-active={account.isActive}>{account.isActive ? 'Active' : 'Inactive'}</span></Link>) : <div className={styles.empty}><Users size={26} aria-hidden="true" /><h3>No administrators yet</h3><p>Add an administrator to manage this institute’s accounts and courses.</p><Link href={`${base}/institute-admins`} className={styles.button}>Add administrator</Link></div>}
        <p className={styles.note}>Super Users can review course information and manage administrator access. Institute administrators handle day-to-day account and course management.</p>
      </section>
    </div>
  </section>;
}

export function Loading({ label }: { label: string }) {
  return <div className={styles.loading} role="status"><span className={styles.srOnly}>{label}</span><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></div>;
}

export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className={styles.empty} role="alert"><TriangleAlert size={24} aria-hidden="true" /><h3>Information unavailable</h3><p>{message}</p><button className={styles.button} onClick={retry}><RefreshCw size={15} aria-hidden="true" />Try again</button></div>;
}
