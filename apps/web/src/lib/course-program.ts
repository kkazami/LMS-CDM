import type { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth-session';
import { AccessError } from '@/lib/super-user-v1/actor';

export async function validateCourseProgram(tx: Prisma.TransactionClient, instituteId: string, programId: string | null) {
  if (!programId) return;
  const program = await tx.academicProgram.findFirst({ where: { id: programId, instituteId, isActive: true }, select: { id: true } });
  if (!program) throw new AccessError(400, 'Choose an active program in this institute.');
}

export async function setCourseProgram(tx: Prisma.TransactionClient, courseId: string, programId: string | null) {
  const session = await getSession();
  if (!session) throw new AccessError(401, 'Authentication required.');
  try {
    await tx.$executeRaw`SELECT super_user_security.set_course_program(${session.id}, ${session.tokenHash}, ${courseId}, ${programId})`;
  } catch (error) {
    const code = (error as { meta?: { code?: string } }).meta?.code;
    if (code === '42501') throw new AccessError(403, 'Program assignment is not authorized.');
    if (code === 'P0002') throw new AccessError(404, 'Class or active program not found.');
    throw error;
  }
}
