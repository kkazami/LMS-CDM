import { notFound } from 'next/navigation';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { requireCourseAccess } from '@/lib/course-access';
import LabRunner from '@/components/labs/LabRunner';

export const dynamic = 'force-dynamic';
export default async function AssignedLabPage({ params, searchParams }: {
  params: Promise<{ institute: string; courseId: string; assignmentId: string }>;
  searchParams: Promise<{ studentId?: string; attemptId?: string }>;
}) {
  const scope = await params;
  const actor = await requireLegacyActor('courses/labs/assignment/page.tsx', scope);
  if (scope.institute.toLowerCase() !== 'ics') notFound();
  const course = await requireCourseAccess(actor, scope.courseId);
  if (course.institute.code.toLowerCase() !== 'ics') notFound();
  const search = await searchParams;
  return <LabRunner courseId={course.id} assignmentId={scope.assignmentId} canReview={['INSTRUCTOR', 'ADMIN'].includes(canonicalRole(actor.role))} initialStudentId={search.studentId} initialAttemptId={search.attemptId} />;
}
