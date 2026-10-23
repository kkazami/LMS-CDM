import { db } from './db';
import { lockAccounts } from './super-user-v1/account-lock';
import { AccessError } from './super-user-v1/actor';
import { canonicalRole, mayAdmitAccount } from './super-user-v1/capabilities';
import { sessionExpired } from './session-policy';

export async function enrollWithClassCode(session: { id: string; userId: string; tokenHash: string }, code: string) {
  if (typeof code !== 'string' || !/^[a-z0-9-]{4,32}$/i.test(code.trim())) throw new AccessError(400, 'Enter a valid class code.');
  return db.$transaction(async tx => {
    await lockAccounts(tx, [session.userId]);
    const current = await tx.session.findUnique({ where: { id: session.id }, include: { user: { include: { institute: true } } } });
    if (!current || current.userId !== session.userId || current.tokenHash !== session.tokenHash || sessionExpired(current) || !mayAdmitAccount(current.user)) throw new AccessError(401, 'Sign in again to join a class.');
    if (canonicalRole(current.user.role) !== 'STUDENT') throw new AccessError(403, 'Only students can join classes.');
    // Lock against concurrent archive or institute changes until enrollment commits.
    const [course] = await tx.$queryRaw<Array<{ id: string; instituteId: string; isArchived: boolean }>>`
      SELECT id, "instituteId", "isArchived" FROM "Course" WHERE "courseCode" = ${code.trim().toUpperCase()} FOR SHARE`;
    if (!course || course.isArchived || course.instituteId !== current.user.instituteId) throw new AccessError(400, 'This class code is not available in your institute. Check the code with your instructor.');
    const key = { courseId: course.id, studentId: current.userId };
    const existing = await tx.enrollment.findUnique({ where: { courseId_studentId: key } });
    if (existing && ['REJECTED', 'DECLINED'].includes(existing.status)) throw new AccessError(403, 'Your request was declined. Contact your instructor to join this class.');
    await tx.enrollment.upsert({ where: { courseId_studentId: key }, create: { ...key, status: 'APPROVED' }, update: { status: 'APPROVED' } });
    return { courseId: course.id, redirectTo: `/${current.user.institute.code}/students` };
  });
}
