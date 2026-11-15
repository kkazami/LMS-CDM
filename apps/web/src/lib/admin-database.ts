import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { administratorInstitute } from '@/lib/administrator-scope';
import { AccessError, requireActor, revalidateActor } from '@/lib/super-user-v1/actor';
import { getSessionFromRequest } from '@/lib/api-auth';

type Scope = (instituteId: string) => Record<string, unknown>;
const institute: Scope = instituteId => ({ instituteId });
const course: Scope = instituteId => ({ course: { instituteId } });
const item: Scope = instituteId => ({ syllabusItem: { course: { instituteId } } });
const student: Scope = instituteId => ({ student: { instituteId } });
const user: Scope = instituteId => ({ user: { instituteId } });

// Secret vaults, authentication and anonymous social records retain dedicated APIs.
export const databaseTables: Record<string, Scope> = {
  User: institute, Institute: id => ({ id }), Course: institute, SyllabusItem: course,
  Enrollment: course, Attachment: item, StudentGroup: course, StudentSubmission: item,
  GradingPolicy: course, GamificationProfile: student, StudentBadge: id => ({ profile: { student: { instituteId: id } } }),
  ExpTransaction: user, ActivityTemplate: course,
  ActivitySubmission: id => ({ template: { course: { instituteId: id } }, student: { instituteId: id } }),
  ActivitySession: id => ({ template: { course: { instituteId: id } }, student: { instituteId: id } }),
  Announcement: course, Notification: user, TaskItem: institute,
};
type Delegate = {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  count(args: Record<string, unknown>): Promise<number>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
};
function table(client: unknown, model: string, instituteId: string) {
  if (!Object.hasOwn(databaseTables, model)) throw new AccessError(403, 'This model is not available through institute database tools.');
  const delegate = (client as Record<string, unknown>)[model[0].toLowerCase() + model.slice(1)] as Delegate;
  return { delegate, where: databaseTables[model](instituteId) };
}
export async function databaseAdministrator(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) throw new AccessError(401, 'Authentication required.');
  await administratorInstitute(session.user);
  return session.user;
}
export async function databaseRows(model: string, instituteId: string, take: number) {
  const { delegate, where } = table(db, model, instituteId);
  const [rows, totalCount] = await Promise.all([delegate.findMany({ where, take, orderBy: { id: 'asc' } }), delegate.count({ where })]);
  const safeRows = rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) =>
    !/password|token|secret|pin|credential|googleSubject|preferences/i.test(key))));
  return { rows: safeRows, totalCount };
}
export async function databaseCount(model: string, instituteId: string) {
  const { delegate, where } = table(db, model, instituteId);
  return delegate.count({ where });
}
const text = z.string().max(50000);
const restoreFields = {
  User: z.object({ name: z.string().trim().min(1).max(200).optional(), bio: text.optional(), phone: z.string().max(100).optional(), department: z.string().max(200).optional(), yearLevel: z.string().max(100).optional() }).strict(),
  Course: z.object({ title: z.string().trim().min(1).max(300).optional(), description: text.optional(), subject: z.string().max(300).optional(), room: z.string().max(100).optional() }).strict(),
  SyllabusItem: z.object({ title: z.string().trim().min(1).max(300).optional(), description: text.optional() }).strict(),
};
export async function restoreDatabaseRows(request: Request, model: string, records: unknown[]) {
  const actor = await requireActor(request, ['ADMIN']);
  if (!Object.hasOwn(restoreFields, model)) throw new AccessError(403, 'This model cannot be restored through database tools.');
  const schema = restoreFields[model as keyof typeof restoreFields];
  const patches = records.map(record => {
    const { id, ...fields } = z.object({ id: z.string().min(1).max(200) }).passthrough().parse(record);
    const data = schema.parse(fields);
    if (!Object.keys(data).length) throw new AccessError(400, 'Each record needs a writable field.');
    return { id, data };
  });
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await revalidateActor(tx, actor, ['ADMIN']);
    const { delegate, where } = table(tx, model, current.instituteId);
    for (const patch of patches) {
      const result = await delegate.updateMany({ where: { ...where, id: patch.id,
        ...(model === 'User' ? { id: { equals: patch.id, not: current.id }, role: { in: ['STUDENT', 'PROFESSOR', 'TEACHER', 'INSTRUCTOR'] } } : {}) }, data: patch.data });
      if (result.count !== 1) throw new AccessError(404, 'An authorized existing record was not found. No records were restored.');
    }
    await tx.auditLog.create({ data: { adminId: current.id, targetId: current.id, action: 'DATABASE_TABLE_RESTORED', metadata: JSON.stringify({ model, recordsRestored: patches.length }) } });
    return patches.length;
  });
}
