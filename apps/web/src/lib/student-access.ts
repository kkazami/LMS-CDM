import { db } from './db';
import { canonicalRole } from './super-user-v1/capabilities';

/** Foreign, archived and pending classes grant no institute access. */
export async function needsClassEnrollment(user: { id: string; role: string; instituteId: string }) {
  if (canonicalRole(user.role) !== 'STUDENT') return false;
  return !await db.enrollment.findFirst({
    where: { studentId: user.id, status: 'APPROVED', course: { instituteId: user.instituteId, isArchived: false } },
    select: { id: true },
  });
}
