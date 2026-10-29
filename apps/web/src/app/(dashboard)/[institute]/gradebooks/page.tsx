import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { readGradebook } from '@/lib/gradebook-data';
import { AccessError } from '@/lib/super-user-v1/actor';
import GradebookWorkspace from '@/components/gradebook/GradebookWorkspace';

export const dynamic = 'force-dynamic';
export default async function GradebooksPage({ params, searchParams }: { params: Promise<{ institute: string }>; searchParams: Promise<{ course?: string; page?: string; period?: string }> }) {
  const { institute } = await params;
  const actor = await requireLegacyActor('apps/web/src/app/(dashboard)/[institute]/gradebooks/page.tsx', { institute });
  const role = canonicalRole(actor.role);
  if (!['ADMIN', 'INSTRUCTOR'].includes(role)) redirect(`/${institute}/courses`);
  const courses = await db.course.findMany({ where: { instituteId: actor.instituteId, ...(role === 'INSTRUCTOR' ? { instructorId: actor.id } : {}) }, select: { id: true, title: true, code: true, section: true, isArchived: true }, orderBy: [{ isArchived: 'asc' }, { title: 'asc' }, { id: 'asc' }] });
  const search = await searchParams;
  const selected = search.course ? courses.find(course => course.id === search.course) : courses[0];
  if (search.course && !selected) notFound();
  let data, problem;
  if (selected) try { data = await readGradebook(actor, selected.id, Number(search.page || 1)); }
  catch (error) { if (!(error instanceof AccessError) || ![400, 422].includes(error.status)) throw error; problem = error.message; }
  return <GradebookWorkspace courses={courses} courseId={selected?.id} data={data} problem={problem} instituteCode={institute} initialPeriod={search.period}/>;
}
