import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { requireLabSchema } from './readiness';

export type LabActor = CourseActor;
export type LabTx = Prisma.TransactionClient;

export async function requireIcs(actor: LabActor, teaching = false, tx: LabTx = db) {
  const user = await tx.user.findUnique({ where: { id: actor.id }, include: { institute: { select: { code: true } } } });
  const role = canonicalRole(user?.role);
  if (!user || canonicalRole(actor.role) !== role || user.instituteId !== actor.instituteId || !mayAdmitAccount(user) || user.institute.code.toLowerCase() !== 'ics' || !['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role) || teaching && role === 'STUDENT') throw new AccessError(403, 'Guided practical labs are available only to authorized ICS users.');
  await requireLabSchema(tx);
  return { ...actor, role: user.role };
}

export async function requireLabCourse(actor: LabActor, courseId: string, teaching = false, writing = false, tx: LabTx = db) {
  await requireIcs(actor, teaching, tx);
  const course = await requireCourseAccess(actor, courseId, teaching, tx);
  if (course.institute.code.toLowerCase() !== 'ics') throw new AccessError(404, 'Course not found.');
  if (writing && course.isArchived) throw new AccessError(409, 'This course is archived.');
  return course;
}

export async function assignmentAccess(actor: LabActor, courseId: string, assignmentId: string, writing = false, teaching = false, tx: LabTx = db) {
  const course = await requireLabCourse(actor, courseId, teaching, writing, tx);
  const assignment = await tx.labAssignment.findFirst({ where: { id: assignmentId, courseId }, include: {
    version: { include: { steps: { orderBy: { position: 'asc' } } } },
    syllabusItem: { include: { targetGroups: { include: { group: { select: { members: { where: { studentId: actor.id }, select: { studentId: true } } } } } } } },
  } });
  if (!assignment || assignment.syllabusItem.courseId !== courseId) throw new AccessError(404, 'Practical lab not found.');
  if (canonicalRole(actor.role) === 'STUDENT') {
    const targeted = !assignment.syllabusItem.targetGroups.length || assignment.syllabusItem.targetGroups.some(g => g.group.members.length > 0);
    const started = await tx.labAttempt.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: actor.id } }, select: { submittedAt: true } });
    const published = assignment.publishedAt && (!assignment.opensAt || assignment.opensAt <= new Date());
    if (!targeted || !published || assignment.archivedAt && !started?.submittedAt) throw new AccessError(404, 'Practical lab not found.');
  }
  if (writing && assignment.archivedAt) throw new AccessError(409, 'This practical lab is archived.');
  return { assignment, course };
}

export async function attemptAccess(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, writing = false, teaching = false, tx: LabTx = db) {
  const context = await assignmentAccess(actor, courseId, assignmentId, writing, teaching, tx);
  const attempt = await tx.labAttempt.findFirst({ where: { id: attemptId, assignmentId, versionId: context.assignment.versionId }, include: {
    student: { select: { id: true, name: true } },
    responses: { include: { evidence: { include: { asset: { select: { fileName: true, mimeType: true, size: true, scanStatus: true } } }, orderBy: { createdAt: 'asc' } } } },
    submissions: { orderBy: { round: 'asc' }, include: { reviews: { orderBy: { createdAt: 'asc' } } } },
    reviews: { orderBy: { createdAt: 'asc' } },
  } });
  if (!attempt || canonicalRole(actor.role) === 'STUDENT' && attempt.studentId !== actor.id) throw new AccessError(404, 'Attempt not found.');
  return { ...context, attempt };
}

export function ensureWritable(attempt: { status: string; revisionDueAt: Date | null }, dueDate: Date | null, now = new Date()) {
  if (!['IN_PROGRESS', 'NEEDS_REVISION'].includes(attempt.status)) throw new AccessError(409, 'Submitted work is read-only until your instructor requests a correction.');
  const deadline = attempt.status === 'NEEDS_REVISION' ? attempt.revisionDueAt : dueDate;
  if (deadline && now >= deadline) throw new AccessError(409, 'The deadline has passed. Ask your instructor to reopen this work.');
}

export function requireStudent(actor: LabActor) {
  if (canonicalRole(actor.role) !== 'STUDENT') throw new AccessError(403, 'Students only.');
}
