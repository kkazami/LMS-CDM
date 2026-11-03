import { randomInt } from 'node:crypto';
import type { OhmwardAttempt, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { grantExp } from '@/lib/gamification/grant-exp';
import { challengeUnlocked, getLevel } from '../curriculum/catalog';
import { EMPTY_STATE, type Attempt, type Grade, type Progress, type ResponseState } from '../domain/types';
import { OhmwardError, saveSchema } from '../domain/schema';
import { HINTS, gradeResponse } from './grading';
import { type Actor, freshStudent, studentOnly, rosterWhere, assertCourse } from './access';
import { emptyWorkspace, sandboxCapabilities, sandboxValidation } from '../domain/workspace';
import { starterState } from '../curriculum/controller-starters';

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function serializeAttempt(attempt: OhmwardAttempt): Attempt {
  const hintIds = attempt.hintIds as string[];
  return { id: attempt.id, levelId: attempt.levelId, contentVersion: attempt.contentVersion, variantId: attempt.variantId, status: attempt.status as Attempt['status'], revision: attempt.revision,
    state: attempt.state as unknown as ResponseState, hintIds, revealedHints: hintIds.map(id => HINTS[attempt.levelId]?.[Number(id)] ?? ''), result: attempt.result as unknown as Grade | null,
    startedAt: attempt.startedAt.toISOString(), submittedAt: attempt.submittedAt?.toISOString() ?? null };
}
async function write<T>(actor: Actor, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  studentOnly(actor);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT set_config('lock_timeout','5s',true), set_config('statement_timeout','10s',true)`;
    await freshStudent(tx, actor);
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`ohmward:${actor.id}`},0))`;
    await tx.ohmwardLearner.upsert({ where: { studentId: actor.id }, create: { studentId: actor.id, instituteId: actor.instituteId }, update: {} });
    return work(tx);
  }, { maxWait: 5000, timeout: 15000 });
}
async function owned(tx: Prisma.TransactionClient | typeof db, actor: Actor, id: string) {
  studentOnly(actor);
  const attempt = await tx.ohmwardAttempt.findFirst({ where: { id, studentId: actor.id, instituteId: actor.instituteId } });
  if (!attempt) throw new OhmwardError(404, 'Attempt not found.');
  return attempt;
}
function editable(attempt: OhmwardAttempt, revision: number) {
  if (attempt.status !== 'IN_PROGRESS') throw new OhmwardError(409, 'This attempt is already final. Open a new replay.');
  if (attempt.revision !== revision) throw new OhmwardError(409, 'A newer save exists. Keep this page open, or reload the saved version.');
}
export async function personalProgress(actor: Actor) {
  studentOnly(actor);
  const [learner, rows] = await Promise.all([
    db.ohmwardLearner.findFirst({ where: { studentId: actor.id, instituteId: actor.instituteId }, select: { primerCompletedAt: true, lastLevelId: true } }),
    db.ohmwardProgress.findMany({ where: { studentId: actor.id, instituteId: actor.instituteId }, orderBy: { levelId: 'asc' } }),
  ]);
  const progress: Progress[] = rows.map(row => ({ levelId: row.levelId, bestScore: row.bestScore, bestStars: row.bestStars, firstPassedAt: row.firstPassedAt?.toISOString() ?? null, submittedCount: row.submittedCount }));
  return { primerCompleted: Boolean(learner?.primerCompletedAt), lastLevelId: learner?.lastLevelId ?? null, progress };
}
export async function completePrimer(actor: Actor) {
  return write(actor, async tx => {
    await tx.ohmwardLearner.updateMany({ where: { studentId: actor.id, instituteId: actor.instituteId, primerCompletedAt: null }, data: { primerCompletedAt: new Date() } });
    return { primerCompleted: true };
  });
}
export async function startAttempt(actor: Actor, levelId: string) {
  const level = getLevel(levelId); if (!level) throw new OhmwardError(404, 'This level is coming soon.');
  return write(actor, async tx => {
    const learner = await tx.ohmwardLearner.findUniqueOrThrow({ where: { studentId: actor.id } });
    const passed = await tx.ohmwardProgress.findMany({ where: { studentId: actor.id, firstPassedAt: { not: null } }, select: { levelId: true } });
    if (!challengeUnlocked(levelId, Boolean(learner.primerCompletedAt), passed.map(row => row.levelId))) throw new OhmwardError(403, 'Finish the prerequisite before opening this challenge.');
    const open = await tx.ohmwardAttempt.findFirst({ where: { studentId: actor.id, levelId, status: 'IN_PROGRESS' } });
    await tx.ohmwardLearner.update({ where: { studentId: actor.id }, data: { lastLevelId: levelId } });
    if(open)return serializeAttempt(open);
    const variantId=level.variants[randomInt(level.variants.length)].id;
    const state=level.kind==='controller-build'||level.kind==='instruction-order'?starterState(level,variantId):EMPTY_STATE;
    return serializeAttempt(await tx.ohmwardAttempt.create({data:{studentId:actor.id,instituteId:actor.instituteId,levelId,contentVersion:level.version,variantId,state:json(state)}}));
  });
}
export async function readAttempt(actor: Actor, id: string) { return serializeAttempt(await owned(db, actor, id)); }
export async function readSandbox(actor:Actor) {
  studentOnly(actor);
  return db.$transaction(async tx=>{
    await freshStudent(tx,actor);
    const [learner,progress]=await Promise.all([tx.ohmwardLearner.findFirst({where:{studentId:actor.id,instituteId:actor.instituteId}}),tx.ohmwardProgress.findMany({where:{studentId:actor.id,instituteId:actor.instituteId,firstPassedAt:{not:null}},select:{levelId:true}})]);
    return {revision:learner?.sandboxRevision??0,state:learner?.sandbox ? learner.sandbox as unknown as ResponseState : emptyWorkspace(),capabilities:sandboxCapabilities(progress.map(row=>row.levelId))};
  });
}
export async function saveSandbox(actor:Actor,input:unknown) {
  const {revision,state}=saveSchema.parse(input);
  return write(actor,async tx=>{
    const learner=await tx.ohmwardLearner.findUniqueOrThrow({where:{studentId:actor.id}});
    if(learner.sandboxRevision!==revision)throw new OhmwardError(409,'A newer sandbox save exists. Keep this tab open or reload the saved workspace.');
    const progress=await tx.ohmwardProgress.findMany({where:{studentId:actor.id,instituteId:actor.instituteId,firstPassedAt:{not:null}},select:{levelId:true}});
    const error=sandboxValidation(state,progress.map(row=>row.levelId));if(error)throw new OhmwardError(400,error);
    const row=await tx.ohmwardLearner.update({where:{studentId:actor.id},data:{sandbox:json(state),sandboxRevision:{increment:1}}});
    return {revision:row.sandboxRevision,state:row.sandbox as unknown as ResponseState,capabilities:sandboxCapabilities(progress.map(row=>row.levelId))};
  });
}
export async function saveAttempt(actor: Actor, id: string, input: unknown) {
  const { revision, state } = saveSchema.parse(input);
  return write(actor, async tx => {
    const attempt = await owned(tx, actor, id); editable(attempt, revision);
    return serializeAttempt(await tx.ohmwardAttempt.update({ where: { id }, data: { state: json(state), revision: { increment: 1 } } }));
  });
}
export async function revealHint(actor: Actor, id: string, index: number) {
  return write(actor, async tx => {
    const attempt = await owned(tx, actor, id);
    if (attempt.status !== 'IN_PROGRESS') throw new OhmwardError(409, 'Hints are available during an active attempt.');
    const hintIds = attempt.hintIds as string[], requested = String(index);
    if (!HINTS[attempt.levelId]?.[index]) throw new OhmwardError(404, 'Hint not found.');
    if (hintIds.includes(requested)) return serializeAttempt(attempt);
    if (index !== hintIds.length) throw new OhmwardError(400, 'Reveal hints in order.');
    // Hints do not change draft revision; queued saves update state only, never hint IDs.
    return serializeAttempt(await tx.ohmwardAttempt.update({ where: { id }, data: { hintIds: [...hintIds, requested] } }));
  });
}
export async function submitAttempt(actor: Actor, id: string, input: unknown) {
  const { revision, state } = saveSchema.parse(input);
  return write(actor, async tx => {
    const attempt = await owned(tx, actor, id);
    if (attempt.status === 'SUBMITTED') return { attempt: serializeAttempt(attempt), xpGranted: 0 };
    editable(attempt, revision);
    const grade = gradeResponse(attempt.levelId, attempt.contentVersion, attempt.variantId, state, (attempt.hintIds as string[]).length);
    const now = new Date();
    const previous = await tx.ohmwardProgress.findUnique({ where: { studentId_levelId: { studentId: actor.id, levelId: attempt.levelId } } });
    const row = await tx.ohmwardAttempt.update({ where: { id }, data: { state: json(state), result: json(grade), status: 'SUBMITTED', submittedAt: now, revision: { increment: 1 } } });
    await tx.ohmwardProgress.upsert({ where: { studentId_levelId: { studentId: actor.id, levelId: attempt.levelId } },
      create: { studentId: actor.id, instituteId: actor.instituteId, levelId: attempt.levelId, bestScore: grade.score, bestStars: grade.stars, firstPassedAt: grade.passed ? now : null, lastSubmittedAt: now, submittedCount: 1 },
      update: { bestScore: Math.max(previous?.bestScore ?? 0, grade.score), bestStars: Math.max(previous?.bestStars ?? 0, grade.stars), firstPassedAt: previous?.firstPassedAt ?? (grade.passed ? now : null), lastSubmittedAt: now, submittedCount: { increment: 1 } } });
    const reward = grade.passed ? await grantExp({ userId: actor.id, amount: 50, reason: `Completed Ohmward ${attempt.levelId}`, source: 'ohmward', idempotencyKey: `ohmward:${attempt.levelId}:first-pass` }, tx) : null;
    return { attempt: serializeAttempt(row), xpGranted: reward?.grantedAmount ?? 0 };
  });
}
export async function readRoster(actor: Actor, options: { courseId?: string; search?: string; page?: number } = {}) {
  await assertCourse(actor, options.courseId);
  const where: Prisma.UserWhereInput = { ...rosterWhere(actor, options.courseId), ...(options.search ? { OR: [{ name: { contains: options.search, mode: 'insensitive' } }, { studentNumber: { contains: options.search, mode: 'insensitive' } }] } : {}) };
  const [total, students, courses] = await Promise.all([
    db.user.count({ where }), db.user.findMany({ where, skip: ((options.page ?? 1) - 1) * 25, take: 25, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true, studentNumber: true, ohmwardLearner: { select: { primerCompletedAt: true, progress: { select: { levelId: true, bestScore: true, bestStars: true, firstPassedAt: true } } } } } }),
    db.course.findMany({ where: { instituteId: actor.instituteId, isArchived: false, ...(actor.role === 'INSTRUCTOR' ? { instructorId: actor.id } : {}) }, select: { id: true, title: true, code: true }, orderBy: { code: 'asc' } }),
  ]);
  return { total, page: options.page ?? 1, pageSize: 25, courses, students: students.map(row => ({ id: row.id, name: row.name, studentNumber: row.studentNumber, started: Boolean(row.ohmwardLearner?.primerCompletedAt), completed: row.ohmwardLearner?.progress.filter(item => item.firstPassedAt).length ?? 0, stars: row.ohmwardLearner?.progress.reduce((sum, item) => sum + item.bestStars, 0) ?? 0 })) };
}
