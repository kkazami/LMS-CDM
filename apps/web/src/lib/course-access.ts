import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';

export type CourseActor = { id: string; role: string; instituteId: string };

export async function requireCourseAccess(actor: CourseActor, courseId: string, teaching = false, client: Prisma.TransactionClient = db) {
  const role = canonicalRole(actor.role);
  if (!['ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(role) || teaching && role === 'STUDENT') throw new AccessError(403, 'Forbidden.');
  const course = await client.course.findUnique({ where: { id: courseId }, include: { institute: { select: { code: true } } } });
  if (!course || course.instituteId !== actor.instituteId) throw new AccessError(404, 'Course not found.');
  if (role === 'INSTRUCTOR' && course.instructorId !== actor.id) throw new AccessError(403, 'Forbidden course.');
  if (role === 'STUDENT') {
    const enrollment = await client.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: actor.id } } });
    if (enrollment?.status !== 'APPROVED') throw new AccessError(403, 'Not enrolled in this course.');
  }
  return course;
}
