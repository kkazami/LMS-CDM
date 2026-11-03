import { labsAvailable } from '@/lib/labs/readiness';
import { db } from '@/lib/db';
import { requireCourseAccess, type CourseActor } from './course-access';
import { AccessError } from './super-user-v1/actor';
import { readPeriodConfiguration } from './grading/period-service';
import { resolveItemPeriod } from './grading/periods';

export const GRADEBOOK_PAGE_SIZE = 50;
export const GRADEBOOK_ASSIGNMENT_LIMIT = 200;
export async function readGradebook(actor: CourseActor, courseId: string, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new AccessError(400, 'Invalid page.');
  const course = await requireCourseAccess(actor, courseId, true);
  const [enrollments, total, assignments, gradingPolicy, periodConfiguration] = await Promise.all([
    db.enrollment.findMany({ where: { courseId, status: 'APPROVED' }, select: { student: { select: { id: true, name: true, email: true, studentNumber: true } } }, orderBy: [{ student: { name: 'asc' } }, { id: 'asc' }], skip: (page - 1) * GRADEBOOK_PAGE_SIZE, take: GRADEBOOK_PAGE_SIZE }),
    db.enrollment.count({ where: { courseId, status: 'APPROVED' } }),
    db.syllabusItem.findMany({ where: { courseId, type: { not: 'MATERIAL' }, maxPoints: { gt: 0 } }, select: { id: true, title: true, maxPoints: true, type: true, dueDate: true, labAssignment: await labsAvailable() ? ({ select: { id: true, publishedAt: true, archivedAt: true } } as const) : false as const }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }], take: GRADEBOOK_ASSIGNMENT_LIMIT + 1 }),
    db.gradingPolicy.findUnique({ where: { courseId }, select: { weights: { select: { category: true, weightPercentage: true } } } }),
    readPeriodConfiguration(courseId),
  ]);
  // Never silently calculate a final grade from a truncated assignment history.
  if (page > Math.max(1, Math.ceil(total / GRADEBOOK_PAGE_SIZE))) throw new AccessError(400, 'This student page no longer exists. Return to the first page.');
  if (assignments.length > GRADEBOOK_ASSIGNMENT_LIMIT) throw new AccessError(422, 'This course exceeds the interactive limit of 200 graded activities. Use the complete CSV export.');
  const students = enrollments.map(e => e.student);
  const submissions = students.length && assignments.length ? await db.studentSubmission.findMany({
    where: { studentId: { in: students.map(s => s.id) }, syllabusItemId: { in: assignments.map(a => a.id) } },
    select: { id: true, studentId: true, syllabusItemId: true, grade: true, status: true, isReturned: true, submittedAt: true,
      attachments: { select: { id: true, type: true, fileName: true }, orderBy: { createdAt: 'asc' }, take: 21 } },
  }) : [];
  const grades: Record<string, Record<string, { submissionId: string | null; grade: number | null; status: string | null; isReturned?: boolean; submittedAt?: string | null; attachments: { id: string; type: string; fileName: string; url: string }[]; labAttemptId?: string | null; labRevision?: number | null; labStatus?: string | null }>> = {};
  for (const student of students) {
    grades[student.id] = {};
    for (const assignment of assignments) grades[student.id][assignment.id] = { submissionId: null, grade: null, status: null, isReturned: false, submittedAt: null, attachments: [] };
  }
  if (submissions.some(sub => sub.attachments.length > 20)) throw new AccessError(422, 'A submission exceeds the interactive limit of 20 attachments. Open the assignment submissions page to review it.');
  for (const sub of submissions) grades[sub.studentId][sub.syllabusItemId] = { submissionId: sub.id, grade: sub.grade, status: sub.status, isReturned: sub.isReturned, submittedAt: sub.submittedAt?.toISOString() ?? null,
    attachments: sub.attachments.map(a => ({ ...a, url: `/api/submission-attachments/${a.id}` })) };
  const labItems = assignments.filter(item => item.labAssignment);
  if (labItems.length && students.length) {
    const attempts = await db.labAttempt.findMany({ where: { assignmentId: { in: labItems.map(item => item.labAssignment!.id) }, studentId: { in: students.map(student => student.id) } }, select: { id: true, assignmentId: true, studentId: true, revision: true, status: true } });
    const itemsByLab = new Map(labItems.map(item => [item.labAssignment!.id, item.id]));
    for (const attempt of attempts) Object.assign(grades[attempt.studentId][itemsByLab.get(attempt.assignmentId)!], { labAttemptId: attempt.id, labRevision: attempt.revision, labStatus: attempt.status });
  }
  return { course: { id: course.id, title: course.title, code: course.code }, students, assignments: assignments.map(a => ({ ...a, gradingPeriod: resolveItemPeriod(a.type, periodConfiguration.assignments[a.id]), labAssignmentId: a.labAssignment?.id ?? null, labCanManage: Boolean(a.labAssignment?.publishedAt && !a.labAssignment.archivedAt && !course.isArchived), dueDate: a.dueDate?.toISOString() ?? null })), grades, gradingPolicy,
    periodPolicy: periodConfiguration.policy, periodsAvailable: periodConfiguration.available,
    pagination: { page, pageSize: GRADEBOOK_PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / GRADEBOOK_PAGE_SIZE)) } };
}
