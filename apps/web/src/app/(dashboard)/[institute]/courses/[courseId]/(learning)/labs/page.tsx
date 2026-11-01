import { labsAvailable, LAB_SETUP_MESSAGE } from '@/lib/labs/readiness';
import { notFound } from 'next/navigation';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { requireCourseAccess } from '@/lib/course-access';
import { db } from '@/lib/db';
import LabCourseWorkspace from '@/components/labs/LabCourseWorkspace';

export const dynamic = 'force-dynamic';
export default async function CourseLabsPage({ params, searchParams }: {
  params: Promise<{ institute: string; courseId: string }>;
  searchParams: Promise<{ itemId?: string }>;
}) {
  const scope = await params;
  const actor = await requireLegacyActor('courses/labs/page.tsx', scope);
  if (scope.institute.toLowerCase() !== 'ics') notFound();
  const course = await requireCourseAccess(actor, scope.courseId);
  if (course.institute.code.toLowerCase() !== 'ics') notFound();
  if (!await labsAvailable()) return <section className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Guided practical labs</h1><p className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">{LAB_SETUP_MESSAGE}</p><p className="mt-4">No lab data or existing coursework has been changed.</p></section>;
  const canEdit = ['INSTRUCTOR', 'ADMIN'].includes(canonicalRole(actor.role));
  const groups = canEdit ? await db.studentGroup.findMany({ where: { courseId: course.id }, select: { id: true, groupName: true }, orderBy: { groupName: 'asc' } }) : [];
  const search = await searchParams;
  const itemId = canEdit && typeof search.itemId === 'string' ? search.itemId : undefined;
  const linked = itemId ? await db.syllabusItem.findFirst({ where: { id: itemId, courseId: course.id }, select: { dueDate: true } }) : null;
  if (itemId && !linked) notFound();
  return <LabCourseWorkspace viewerId={actor.id} linkedDueDate={linked?.dueDate?.toISOString() ?? null} courseId={course.id} courseTitle={course.title} canEdit={canEdit} groups={groups} linkItemId={itemId} />;
}
