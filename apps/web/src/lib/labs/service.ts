import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { lockAcademicRecord } from '@/lib/academic-records';
import { lockSyllabusItem, markAcademicWorkStarted } from '@/lib/academic-task';
import { scanUpload, verifiedFileType, withUploadSlot } from '@/lib/private-upload';
import { requireIcs, requireLabCourse, assignmentAccess, attemptAccess, ensureWritable, requireStudent, type LabActor, type LabTx } from './access';
import { assignmentInput, assignmentPatch, templateDefinition, reviewInput, reopenInput, submitInput, parseAnswer, responseComplete, stepSchema, LAB_MAX_BYTES, LAB_MIME_TYPES, type LabDefinition } from './schema';
import { MYSQL_LAB } from './mysql';

const inputJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const dto = <T>(value: T) => JSON.parse(JSON.stringify(value, (_key, v: unknown) => typeof v === 'bigint' ? Number(v) : v)) as T;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const definitionFields = (definition: Pick<LabDefinition, 'title' | 'description' | 'objective' | 'prerequisites' | 'requiredTools' | 'estimatedMinutes'>) => ({ title: definition.title, description: definition.description, objective: definition.objective, prerequisites: definition.prerequisites, requiredTools: definition.requiredTools, estimatedMinutes: definition.estimatedMinutes });
const stepsData = (definition: LabDefinition) => definition.steps.map((step, position) => ({ key: step.key, type: step.type, title: step.title, required: step.required, config: inputJson(step.config), position }));
const templateInclude = { versions: { orderBy: { number: 'desc' as const }, include: { steps: { orderBy: { position: 'asc' as const } } } } };

export async function listTemplates(actor: LabActor) {
  await requireIcs(actor, true);
  return dto(await db.labTemplate.findMany({ where: { instituteId: actor.instituteId, archivedAt: null, ...(canonicalRole(actor.role) === 'ADMIN' ? {} : { authorId: actor.id }) }, include: templateInclude, orderBy: { updatedAt: 'desc' }, take: 100 }));
}

async function ownedTemplate(actor: LabActor, id: string, tx: LabTx = db) {
  await requireIcs(actor, true, tx);
  const template = await tx.labTemplate.findFirst({ where: { id, instituteId: actor.instituteId, ...(canonicalRole(actor.role) === 'ADMIN' ? {} : { authorId: actor.id }) }, include: templateInclude });
  if (!template) throw new AccessError(404, 'Template not found.');
  return template;
}

export async function getTemplate(actor: LabActor, id: string) { return dto(await ownedTemplate(actor, id)); }

export async function createTemplate(actor: LabActor, raw: unknown) {
  const preset = z.object({ preset: z.literal('MYSQL') }).strict().safeParse(raw);
  const definition = templateDefinition.parse(preset.success ? MYSQL_LAB : raw);
  return db.$transaction(async tx => {
    await requireIcs(actor, true, tx);
    return dto(await tx.labTemplate.create({ data: { instituteId: actor.instituteId, authorId: actor.id, title: definition.title, category: definition.category, versions: { create: { ...definitionFields(definition), number: 1, steps: { create: stepsData(definition) } } } }, include: templateInclude }));
  });
}

export async function saveTemplate(actor: LabActor, id: string, raw: unknown) {
  const parsed = templateDefinition.extend({ expectedRevision: z.number().int().nonnegative() }).parse(raw);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "LabTemplate" WHERE "id" = ${id} FOR UPDATE`;
    const template = await ownedTemplate(actor, id, tx);
    if (template.archivedAt) throw new AccessError(409, 'Template is archived.');
    const version = template.versions.find(v => v.status === 'DRAFT');
    if (!version) throw new AccessError(409, 'Published instructions are immutable. Create a new draft first.');
    if (version.revision !== parsed.expectedRevision) throw new AccessError(409, 'This draft changed in another window. Reload before saving.');
    await tx.labStep.deleteMany({ where: { versionId: version.id } });
    await tx.labTemplateVersion.update({ where: { id: version.id }, data: { ...definitionFields(parsed), revision: { increment: 1 }, steps: { create: stepsData(parsed) } } });
    await tx.labTemplate.update({ where: { id }, data: { title: parsed.title, category: parsed.category } });
    return dto(await ownedTemplate(actor, id, tx));
  });
}

export async function draftTemplate(actor: LabActor, id: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "LabTemplate" WHERE "id" = ${id} FOR UPDATE`;
    const template = await ownedTemplate(actor, id, tx);
    if (template.archivedAt) throw new AccessError(409, 'Template is archived.');
    if (template.versions.some(v => v.status === 'DRAFT')) return dto(template);
    const source = template.versions[0];
    await tx.labTemplateVersion.create({ data: { templateId: id, number: source.number + 1, title: source.title, description: source.description, objective: source.objective, prerequisites: source.prerequisites, requiredTools: source.requiredTools, estimatedMinutes: source.estimatedMinutes, steps: { create: source.steps.map(step => ({ key: step.key, title: step.title, type: step.type, required: step.required, position: step.position, config: inputJson(step.config) })) } } });
    return dto(await ownedTemplate(actor, id, tx));
  });
}

export async function publishTemplate(actor: LabActor, id: string, raw: unknown) {
  const { expectedRevision } = z.object({ expectedRevision: z.number().int().nonnegative() }).strict().parse(raw);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "LabTemplate" WHERE "id" = ${id} FOR UPDATE`;
    const template = await ownedTemplate(actor, id, tx);
    const version = template.versions.find(v => v.status === 'DRAFT');
    if (!version || template.archivedAt || version.revision !== expectedRevision) throw new AccessError(409, 'Draft changed or has already been published.');
    templateDefinition.parse({ ...definitionFields(version), category: template.category, steps: version.steps.map(s => ({ key: s.key, title: s.title, type: s.type, required: s.required, config: s.config })) });
    await tx.labTemplateVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    return dto(await ownedTemplate(actor, id, tx));
  });
}

export async function createAssignment(actor: LabActor, courseId: string, raw: unknown) {
  const input = assignmentInput.parse(raw);
  return db.$transaction(async tx => {
    await requireLabCourse(actor, courseId, true, true, tx);
    const version = await tx.labTemplateVersion.findFirst({ where: { id: input.versionId, status: 'PUBLISHED', template: { instituteId: actor.instituteId, archivedAt: null, ...(canonicalRole(actor.role) === 'ADMIN' ? {} : { authorId: actor.id }) } } });
    if (!version) throw new AccessError(404, 'Published template not found.');
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;
    const opensAt = input.opensAt ? new Date(input.opensAt) : null;
    if (dueDate && opensAt && dueDate <= opensAt) throw new AccessError(400, 'The due date must be after the start date.');
    let itemId = input.syllabusItemId;
    if (itemId) {
      await lockSyllabusItem(tx, itemId);
      const item = await tx.syllabusItem.findFirst({ where: { id: itemId, courseId }, omit: { workHistoryState: false }, include: { labAssignment: true, form: true, submissions: { omit: { workHistoryState: false }, include: { attachments: { select: { id: true } }, integrityEvents: { select: { id: true } }, githubRepoLinks: { select: { id: true } } } }, attachments: { select: { id: true } }, githubSubmissions: { select: { id: true } } } });
      const interactive = await tx.activityTemplate.count({ where: { syllabusItemId: itemId } });
      if (!item || item.type === 'MATERIAL') throw new AccessError(404, 'Classwork not found.');
      const receipts = item.submissions.length ? await tx.submissionRequest.count({ where: { OR: item.submissions.map(s => ({ response: { path: ['submission', 'id'], equals: s.id } })) } }) : 0;
      if (opensAt && item.dueDate && item.dueDate <= opensAt) throw new AccessError(400, 'The due date must be after the start date.');
      if (item.workHistoryState !== 'UNTOUCHED' || item.labAssignment || item.form || interactive || item.githubSubmissions.length || receipts || item.submissions.some(s => s.workHistoryState !== 'UNTOUCHED' || s.status !== 'DRAFT' || s.grade !== null || s.isReturned || s.submittedAt || s.attachments.length || s.integrityEvents.length || s.githubRepoLinks.length)) throw new AccessError(409, 'This classwork may already contain student work. Create new classwork to attach this lab.');
      if (!item.maxPoints || item.maxPoints < 1) throw new AccessError(400, 'Set positive maximum points before linking a lab.');
    } else {
      const last = await tx.syllabusItem.aggregate({ where: { courseId }, _max: { orderIndex: true } });
      const item = await tx.syllabusItem.create({ data: { courseId, type: input.category ?? 'ACTIVITY', title: input.title ?? version.title, description: version.description, maxPoints: input.maxPoints ?? 100, dueDate, orderIndex: (last._max.orderIndex ?? -1) + 1, workHistoryState: 'UNTOUCHED' } });
      itemId = item.id;
      await lockSyllabusItem(tx, itemId);
      const groups = input.targetGroupIds ?? [];
      if (new Set(groups).size !== groups.length || groups.length && await tx.studentGroup.count({ where: { id: { in: groups }, courseId } }) !== groups.length) throw new AccessError(400, 'Invalid target groups.');
      if (groups.length) await tx.syllabusTargetGroup.createMany({ data: groups.map(groupId => ({ syllabusItemId: itemId!, groupId })) });
    }
    const assignment = await tx.labAssignment.create({ data: { syllabusItemId: itemId, courseId, versionId: version.id, creatorId: actor.id, opensAt } });
    return assignmentDto(await assignmentAccess(actor, courseId, assignment.id, false, true, tx));
  });
}

type AssignmentContext = Awaited<ReturnType<typeof assignmentAccess>>;
function assignmentDto({ assignment, course }: AssignmentContext) {
  return dto({ ...assignment, syllabusItem: { id: assignment.syllabusItem.id, title: assignment.syllabusItem.title, description: assignment.syllabusItem.description, type: assignment.syllabusItem.type, maxPoints: assignment.syllabusItem.maxPoints, dueDate: assignment.syllabusItem.dueDate }, course: { id: course.id, title: course.title, code: course.code }, status: assignment.archivedAt ? 'ARCHIVED' : assignment.publishedAt ? 'PUBLISHED' : 'DRAFT' });
}

export async function listAssignments(actor: LabActor, courseId: string) {
  await requireLabCourse(actor, courseId);
  const ids = await db.labAssignment.findMany({ where: { courseId }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 101 });
  if (ids.length > 100) throw new AccessError(422, 'This course exceeds the interactive limit of 100 practical labs. Open an individual lab through its Classwork item.');
  const items = [];
  for (const { id } of ids) {
    try { items.push(await getAssignment(actor, courseId, id)); }
    catch (error) { if (!(error instanceof AccessError) || error.status !== 404) throw error; }
  }
  return items;
}

export async function getAssignment(actor: LabActor, courseId: string, assignmentId: string, page = 1, studentId?: string) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new AccessError(400, 'Invalid submission page.');
  const context = await assignmentAccess(actor, courseId, assignmentId);
  const where = { assignmentId, ...(canonicalRole(actor.role) === 'STUDENT' ? { studentId: actor.id } : studentId ? { studentId } : {}) };
  const total = await db.labAttempt.count({ where });
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) throw new AccessError(400, 'This submission page no longer exists. Return to the first page.');
  const attempts = await db.labAttempt.findMany({ where, select: { id: true, status: true, score: true, submittedAt: true, revisionDueAt: true, student: { select: { id: true, name: true } } }, orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize });
  return { ...assignmentDto(context), attempts: dto(attempts.map(a => ({ ...a, score: a.score === null ? null : Number(a.score) }))), attemptPagination: { page, pageSize, total, totalPages } };
}

async function notify(tx: LabTx, event: string, userId: string, type: 'CLASSWORK' | 'GRADE' | 'ALERT', title: string, message: string, link: string) {
  await tx.notification.createMany({ data: [{ id: `lab_${digest([event, userId])}`, userId, type, title, message, link }], skipDuplicates: true });
}

export async function patchAssignment(actor: LabActor, courseId: string, assignmentId: string, raw: unknown) {
  const input = assignmentPatch.parse(raw);
  return db.$transaction(async tx => {
    const initial = await assignmentAccess(actor, courseId, assignmentId, false, true, tx);
    await lockSyllabusItem(tx, initial.assignment.syllabusItemId);
    const { assignment } = await assignmentAccess(actor, courseId, assignmentId, false, true, tx);
    await requireLabCourse(actor, courseId, true, true, tx);
    const dueDate = input.dueDate === undefined ? assignment.syllabusItem.dueDate : input.dueDate ? new Date(input.dueDate) : null;
    const opensAt = input.opensAt === undefined ? assignment.opensAt : input.opensAt ? new Date(input.opensAt) : null;
    if (dueDate && opensAt && dueDate <= opensAt) throw new AccessError(400, 'The due date must be after the start date.');
    if (assignment.publishedAt && input.published === false) throw new AccessError(409, 'Archive published work instead of withdrawing publication.');
    if (await tx.labAttempt.count({ where: { assignmentId } }) && (input.opensAt !== undefined || dueDate && (!assignment.syllabusItem.dueDate || dueDate < assignment.syllabusItem.dueDate) || input.dueDate === null && assignment.syllabusItem.dueDate)) throw new AccessError(409, 'After students start, only extend the due date.');
    await tx.syllabusItem.update({ where: { id: assignment.syllabusItemId }, data: { dueDate } });
    await tx.labAssignment.update({ where: { id: assignmentId }, data: { opensAt, ...(input.archived === undefined ? {} : { archivedAt: input.archived ? new Date() : null }), ...(input.published && !assignment.publishedAt ? { publishedAt: new Date() } : {}) } });
    if (input.published && !assignment.publishedAt) {
      const targets = await tx.enrollment.findMany({ where: { courseId, status: 'APPROVED', ...(assignment.syllabusItem.targetGroups.length ? { student: { groupMemberships: { some: { groupId: { in: assignment.syllabusItem.targetGroups.map(t => t.groupId) } } } } } : {}) }, select: { studentId: true } });
      for (const target of targets) await notify(tx, `published:${assignmentId}`, target.studentId, 'CLASSWORK', 'New practical lab', assignment.syllabusItem.title, `/ics/courses/${courseId}/classwork/${assignment.syllabusItemId}`);
    }
    return assignmentDto(await assignmentAccess(actor, courseId, assignmentId, false, true, tx));
  });
}

export async function openAttempt(actor: LabActor, courseId: string, assignmentId: string) {
  requireStudent(actor);
  const attemptId = await db.$transaction(async tx => {
    const initial = await assignmentAccess(actor, courseId, assignmentId, false, false, tx);
    await lockSyllabusItem(tx, initial.assignment.syllabusItemId);
    await lockAcademicRecord(tx, actor.id, initial.assignment.syllabusItemId);
    const { assignment } = await assignmentAccess(actor, courseId, assignmentId, false, false, tx);
    const existing = await tx.labAttempt.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: actor.id } } });
    if (existing) return existing.id;
    await requireLabCourse(actor, courseId, false, true, tx);
    if (assignment.archivedAt || assignment.syllabusItem.dueDate && assignment.syllabusItem.dueDate < new Date()) throw new AccessError(409, 'This lab is closed. Ask your instructor to reopen it.');
    const attempt = await tx.labAttempt.create({ data: { assignmentId, versionId: assignment.versionId, studentId: actor.id, attemptNumber: 1, evidenceToken: randomBytes(6).toString('hex') } });
    await tx.studentSubmission.upsert({ where: { syllabusItemId_studentId: { syllabusItemId: assignment.syllabusItemId, studentId: actor.id } }, create: { syllabusItemId: assignment.syllabusItemId, studentId: actor.id, workHistoryState: 'STARTED' }, update: { workHistoryState: 'STARTED' } });
    await markAcademicWorkStarted(tx, assignment.syllabusItemId, actor.id);
    return attempt.id;
  });
  return getAttempt(actor, courseId, assignmentId, attemptId);
}

type AttemptContext = Awaited<ReturnType<typeof attemptAccess>>;
function attemptDto(context: AttemptContext) {
  const { attempt } = context;
  return dto({ ...attempt, score: attempt.score === null ? null : Number(attempt.score), assignment: assignmentDto(context), version: context.assignment.version,
    responses: attempt.responses.map(response => ({ ...response, completed: Boolean(response.completedAt), evidence: response.evidence.map(e => ({ id: e.id, fileName: e.asset.fileName, mimeType: e.asset.mimeType, size: e.asset.size, supersededAt: e.supersededAt, url: `/api/labs/evidence/${e.id}` })) })),
    submissions: attempt.submissions.map(s => ({ ...s, reviews: s.reviews.map(r => ({ ...r, score: r.score === null ? null : Number(r.score) })) })),
    reviews: attempt.reviews.map(r => ({ ...r, score: r.score === null ? null : Number(r.score) })),
  });
}
export async function getAttempt(actor: LabActor, courseId: string, assignmentId: string, attemptId: string) { return attemptDto(await attemptAccess(actor, courseId, assignmentId, attemptId)); }

async function lockedAttempt(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, tx: LabTx, teaching = false) {
  const initial = await attemptAccess(actor, courseId, assignmentId, attemptId, false, teaching, tx);
  await lockSyllabusItem(tx, initial.assignment.syllabusItemId);
  await lockAcademicRecord(tx, initial.attempt.studentId, initial.assignment.syllabusItemId);
  const context = await attemptAccess(actor, courseId, assignmentId, attemptId, true, teaching, tx);
  return context;
}

function exactStep(context: AttemptContext, stepId: string) {
  const step = context.assignment.version.steps.find(s => s.id === stepId);
  if (!step) throw new AccessError(404, 'Step does not belong to the assigned version.');
  return { row: step, definition: stepSchema.parse({ key: step.key, type: step.type, title: step.title, required: step.required, config: step.config }) };
}

export async function saveResponse(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, stepId: string, raw: unknown) {
  requireStudent(actor);
  const { expectedRevision, answer: rawAnswer } = z.object({ expectedRevision: z.number().int().nonnegative(), answer: z.unknown() }).strict().parse(raw);
  await db.$transaction(async tx => {
    const context = await lockedAttempt(actor, courseId, assignmentId, attemptId, tx);
    ensureWritable(context.attempt, context.assignment.syllabusItem.dueDate);
    const { definition } = exactStep(context, stepId);
    const answer = parseAnswer(definition, rawAnswer);
    const response = context.attempt.responses.find(r => r.stepId === stepId);
    if ((response?.revision ?? 0) !== expectedRevision) throw new AccessError(409, 'This response changed in another window. Reload before saving.');
    const files = response?.evidence.filter(e => !e.supersededAt).length ?? 0;
    const completedAt = responseComplete(definition, answer, files) ? new Date() : null;
    await tx.labStepResponse.upsert({ where: { attemptId_stepId: { attemptId, stepId } }, create: { attemptId, stepId, versionId: context.attempt.versionId, answer: inputJson(answer), revision: 1, completedAt }, update: { answer: inputJson(answer), revision: { increment: 1 }, completedAt } });
    await tx.labAttempt.update({ where: { id: attemptId }, data: { revision: { increment: 1 }, currentStep: context.assignment.version.steps.findIndex(s => s.id === stepId), lastActivityAt: new Date() } });
  });
  return getAttempt(actor, courseId, assignmentId, attemptId);
}

export async function uploadEvidence(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, stepId: string, file: File, expectedRevision: number, replaceEvidenceId?: string, slotHeld = false) {
  requireStudent(actor);
  z.number().int().nonnegative().parse(expectedRevision);
  const before = await attemptAccess(actor, courseId, assignmentId, attemptId, true);
  ensureWritable(before.attempt, before.assignment.syllabusItem.dueDate);
  const step = exactStep(before, stepId).definition;
  if (step.type !== 'EVIDENCE_UPLOAD') throw new AccessError(400, 'This step does not accept evidence.');
  if (!file.size || file.size > LAB_MAX_BYTES) throw new AccessError(413, 'Maximum file size is 3 MiB.');
  const save = async () => {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = await verifiedFileType(bytes, file.name, file.type);
    if (!(LAB_MIME_TYPES as readonly string[]).includes(mimeType)) throw new AccessError(400, 'Upload a PNG, JPEG, WebP, PDF or plain-text file.');
    await scanUpload(bytes);
    await db.$transaction(async tx => {
      const context = await lockedAttempt(actor, courseId, assignmentId, attemptId, tx);
      ensureWritable(context.attempt, context.assignment.syllabusItem.dueDate);
      const response = context.attempt.responses.find(r => r.stepId === stepId);
      if ((response?.revision ?? 0) !== expectedRevision) throw new AccessError(409, 'Evidence changed in another window. Reload before uploading.');
      const active = response?.evidence.filter(e => !e.supersededAt) ?? [];
      if (replaceEvidenceId && !active.some(e => e.id === replaceEvidenceId)) throw new AccessError(404, 'Replacement evidence not found.');
      if (active.length - (replaceEvidenceId ? 1 : 0) >= step.config.maxFiles) throw new AccessError(409, 'Replace an existing file or use fewer files.');
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`uploads:${actor.id}`}, 0))`;
      const used = await tx.privateAsset.aggregate({ where: { ownerId: actor.id, instituteId: actor.instituteId }, _sum: { size: true } });
      if ((used._sum.size ?? 0) + bytes.length > 250 * 1024 * 1024) throw new AccessError(413, 'Your upload allowance is full. Contact your administrator.');
      const completedAt = responseComplete(step, {}, active.length - (replaceEvidenceId ? 1 : 0) + 1) ? new Date() : null;
      const saved = await tx.labStepResponse.upsert({ where: { attemptId_stepId: { attemptId, stepId } }, create: { attemptId, stepId, versionId: context.attempt.versionId, answer: {}, revision: 1, completedAt }, update: { revision: { increment: 1 }, completedAt } });
      if (replaceEvidenceId) await tx.labEvidence.update({ where: { id: replaceEvidenceId }, data: { supersededAt: new Date() } });
      const fileName = path.basename(file.name.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'evidence';
      const asset = await tx.privateAsset.create({ data: { id: randomUUID(), ownerId: actor.id, instituteId: actor.instituteId, fileName, mimeType, size: bytes.length, content: bytes, scanStatus: 'CLEAN', sha256: createHash('sha256').update(bytes).digest('hex') } });
      await tx.labEvidence.create({ data: { responseId: saved.id, assetId: asset.id } });
      await tx.labAttempt.update({ where: { id: attemptId }, data: { revision: { increment: 1 }, lastActivityAt: new Date() } });
    });
  };
  // HTTP holds the slot while reading multipart bytes; direct service callers acquire it here.
  if (slotHeld) await save(); else await withUploadSlot(save);
  return getAttempt(actor, courseId, assignmentId, attemptId);
}

async function replayable(actor: LabActor, operation: string, targets: string[], key: string, payload: unknown, work: (tx: LabTx) => Promise<unknown>, check: (tx: LabTx) => Promise<unknown>) {
  const receiptId = digest([actor.id, 'guided-labs', operation, key]);
  const requestHash = digest([targets, payload]);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${receiptId}, 0))`;
    await check(tx);
    const receipt = await tx.submissionRequest.findUnique({ where: { id: receiptId } });
    if (receipt) {
      if (receipt.requestHash !== requestHash) throw new AccessError(409, 'Idempotency key was already used for another request.');
      return receipt.response;
    }
    const result = await work(tx);
    await tx.submissionRequest.create({ data: { id: receiptId, userId: actor.id, requestHash, response: inputJson(result) } });
    return result;
  }, { timeout: 15000 });
}

export async function submitAttempt(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, raw: unknown) {
  requireStudent(actor);
  const input = submitInput.parse(raw);
  return replayable(actor, 'submit', [courseId, assignmentId, attemptId], input.idempotencyKey, {}, async tx => {
    const context = await lockedAttempt(actor, courseId, assignmentId, attemptId, tx);
    ensureWritable(context.attempt, context.assignment.syllabusItem.dueDate);
    for (const row of context.assignment.version.steps) {
      const { definition } = exactStep(context, row.id);
      const response = context.attempt.responses.find(r => r.stepId === row.id);
      const active = response?.evidence.filter(e => !e.supersededAt) ?? [];
      if (active.some(e => e.asset.scanStatus !== 'CLEAN') || definition.required && !responseComplete(definition, response?.answer, active.length)) throw new AccessError(400, `Complete the required step: ${row.title}`);
    }
    const round = (context.attempt.submissions.at(-1)?.round ?? 0) + 1;
    const evidence = context.attempt.responses.flatMap(r => r.evidence.filter(e => !e.supersededAt));
    const submission = await tx.labSubmission.create({ data: { attemptId, round, snapshot: inputJson({ responses: context.attempt.responses.map(r => ({ stepId: r.stepId, answer: r.answer, evidenceIds: r.evidence.filter(e => !e.supersededAt).map(e => e.id) })) }), evidence: { create: evidence.map(e => ({ evidenceId: e.id })) } } });
    const now = new Date();
    await tx.labAttempt.update({ where: { id: attemptId }, data: { status: 'SUBMITTED', submittedAt: now, revision: { increment: 1 }, lastActivityAt: now } });
    await tx.studentSubmission.upsert({ where: { syllabusItemId_studentId: { syllabusItemId: context.assignment.syllabusItemId, studentId: actor.id } }, create: { syllabusItemId: context.assignment.syllabusItemId, studentId: actor.id, status: 'SUBMITTED', submittedAt: now, workHistoryState: 'STARTED' }, update: { status: 'SUBMITTED', submittedAt: now, grade: null, isReturned: false, workHistoryState: 'STARTED' } });
    if (context.course.instructorId) await notify(tx, `submitted:${submission.id}`, context.course.instructorId, 'CLASSWORK', 'Practical lab submitted', `${context.attempt.student.name}: ${context.assignment.syllabusItem.title}`, `/ics/courses/${courseId}/labs/${assignmentId}?attemptId=${attemptId}`);
    return { attemptId, status: 'SUBMITTED', submissionId: submission.id, round };
  }, tx => attemptAccess(actor, courseId, assignmentId, attemptId, false, false, tx));
}

export async function reviewAttempt(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, raw: unknown) {
  const input = reviewInput.parse(raw);
  return replayable(actor, 'review', [courseId, assignmentId, attemptId], input.idempotencyKey, input, async tx => {
    const context = await lockedAttempt(actor, courseId, assignmentId, attemptId, tx, true);
    if (context.attempt.status !== 'SUBMITTED') throw new AccessError(409, 'Only a submitted attempt can be reviewed.');
    if (input.stepId) exactStep(context, input.stepId);
    const submission = context.attempt.submissions.at(-1);
    if (!submission) throw new AccessError(409, 'Submission snapshot is unavailable.');
    const now = new Date();
    const revisionDueAt = input.decision === 'NEEDS_REVISION' ? input.revisionDueAt ? new Date(input.revisionDueAt) : new Date(now.getTime() + 7 * 86400000) : null;
    if (revisionDueAt && revisionDueAt <= now) throw new AccessError(400, 'Correction deadline must be in the future.');
    if (input.decision === 'GRADED' && input.score! > (context.assignment.syllabusItem.maxPoints ?? 0)) throw new AccessError(400, 'Grade exceeds maximum points.');
    const score = input.decision === 'GRADED' ? new Prisma.Decimal(input.score!).toDecimalPlaces(2) : null;
    const review = await tx.labReview.create({ data: { attemptId, versionId: context.attempt.versionId, submissionId: submission.id, reviewerId: actor.id, stepId: input.stepId, decision: input.decision, comment: input.comment, score, revisionDueAt } });
    await tx.labAttempt.update({ where: { id: attemptId }, data: { status: input.decision, score, gradedAt: score === null ? null : now, revisionDueAt, revision: { increment: 1 } } });
    await tx.studentSubmission.update({ where: { syllabusItemId_studentId: { syllabusItemId: context.assignment.syllabusItemId, studentId: context.attempt.studentId } }, data: { status: score === null ? 'DRAFT' : 'RETURNED', grade: score === null ? null : Number(score), isReturned: score !== null, workHistoryState: 'STARTED' } });
    await notify(tx, `review:${review.id}`, context.attempt.studentId, score === null ? 'ALERT' : 'GRADE', score === null ? 'Practical lab needs correction' : 'Practical lab graded', `${context.assignment.syllabusItem.title}: ${input.comment}`, `/ics/courses/${courseId}/labs/${assignmentId}`);
    return { attemptId, reviewId: review.id, status: input.decision, score: score === null ? null : Number(score), revisionDueAt: revisionDueAt?.toISOString() ?? null };
  }, tx => attemptAccess(actor, courseId, assignmentId, attemptId, false, true, tx));
}

export async function reopenAttempt(actor: LabActor, courseId: string, assignmentId: string, attemptId: string, raw: unknown) {
  const input = reopenInput.parse(raw);
  return replayable(actor, 'reopen', [courseId, assignmentId, attemptId], input.idempotencyKey, input, async tx => {
    const context = await lockedAttempt(actor, courseId, assignmentId, attemptId, tx, true);
    if (context.attempt.status !== 'NEEDS_REVISION') throw new AccessError(409, 'Only correction requests can be reopened.');
    const revisionDueAt = new Date(input.revisionDueAt);
    if (revisionDueAt <= new Date()) throw new AccessError(400, 'Correction deadline must be in the future.');
    const submission = context.attempt.submissions.at(-1);
    if (!submission) throw new AccessError(409, 'Submission snapshot is unavailable.');
    const review = await tx.labReview.create({ data: { attemptId, versionId: context.attempt.versionId, submissionId: submission.id, reviewerId: actor.id, decision: 'REOPENED', comment: input.comment, revisionDueAt } });
    await tx.labAttempt.update({ where: { id: attemptId }, data: { revisionDueAt, revision: { increment: 1 } } });
    await notify(tx, `reopen:${review.id}`, context.attempt.studentId, 'ALERT', 'Practical lab reopened', input.comment, `/ics/courses/${courseId}/labs/${assignmentId}`);
    return { attemptId, status: 'NEEDS_REVISION', revisionDueAt: revisionDueAt.toISOString(), reviewId: review.id };
  }, tx => attemptAccess(actor, courseId, assignmentId, attemptId, false, true, tx));
}

async function evidenceAsset(actor: LabActor, evidenceId: string) {
  const evidence = await db.labEvidence.findUnique({ where: { id: evidenceId }, include: { response: { include: { attempt: { select: { id: true, assignmentId: true, assignment: { select: { courseId: true } } } } } } } });
  if (!evidence) throw new AccessError(404, 'Evidence not found.');
  const context = await attemptAccess(actor, evidence.response.attempt.assignment.courseId, evidence.response.attempt.assignmentId, evidence.response.attempt.id);
  if (canonicalRole(actor.role) !== 'STUDENT' && !await db.labSubmissionEvidence.count({ where: { evidenceId } })) throw new AccessError(404, 'Evidence has not been submitted.');
  const asset = await db.privateAsset.findFirst({ where: { id: evidence.assetId, ownerId: context.attempt.studentId, instituteId: actor.instituteId, scanStatus: 'CLEAN' } });
  if (!asset) throw new AccessError(404, 'Evidence unavailable.');
  return { bytes: Buffer.from(asset.content), mime: asset.mimeType, name: asset.fileName };
}
export async function readLabEvidence(actor: LabActor, evidenceId: string) { return evidenceAsset(actor, evidenceId); }
export async function authorizeLabAsset(actor: LabActor, assetId: string) {
  const evidence = await db.labEvidence.findUnique({ where: { assetId }, select: { id: true } });
  return evidence ? evidenceAsset(actor, evidence.id) : null;
}
