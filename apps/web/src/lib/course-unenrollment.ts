import { attendanceEnrollmentChanged } from '@/lib/attendance/lifecycle';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { db } from '@/lib/db';
import { AccessError } from '@/lib/super-user-v1/actor';

export async function removeCourseStudent(actor: CourseActor, courseId: string, enrollmentId: string) {
  return db.$transaction(async tx => {
    // Serialize with class-code joins and attendance roster changes.
    await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} AND "instituteId" = ${actor.instituteId} FOR UPDATE`;
    const course = await requireCourseAccess(actor, courseId, true, tx);
    const enrollment = await tx.enrollment.findFirst({
      where: { id: enrollmentId, courseId },
      select: { studentId: true, status: true },
    });

    if (enrollment?.status === 'REMOVED') return course.institute.code;
    if (enrollment?.status !== 'APPROVED') throw new AccessError(404, 'This student is no longer enrolled in the class.');

    await attendanceEnrollmentChanged(tx, courseId, enrollment.studentId, false);
    await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: 'REMOVED' } });
    await tx.studentGroupMember.deleteMany({ where: { studentId: enrollment.studentId, group: { courseId } } });

    return course.institute.code;
  });
}
