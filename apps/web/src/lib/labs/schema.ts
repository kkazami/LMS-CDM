import { z } from 'zod';
import { LAB_BUILTIN_IMAGES, labAssetId, publicReferenceLink, youtubeLink } from './resources';

export const LAB_MAX_BYTES = 3 * 1024 * 1024;
export const LAB_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'] as const;
const text = z.string().trim();
export const resourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('YOUTUBE'), title: text.min(1).max(120), url: text.max(2000).refine(value => Boolean(youtubeLink(value)), 'Use a valid HTTPS YouTube video link.').transform(value => youtubeLink(value)!), caption: text.max(500).optional() }).strict(),
  z.object({ type: z.literal('IMAGE'), title: text.min(1).max(120), url: text.max(300).refine(value => Boolean(labAssetId(value)) || LAB_BUILTIN_IMAGES.some(url => url === value), 'Upload a screenshot using Add screenshot.'), caption: text.max(500).optional() }).strict(),
  z.object({ type: z.literal('LINK'), title: text.min(1).max(120), url: text.max(2000).refine(publicReferenceLink, 'Use a public HTTPS reference link.'), caption: text.max(500).optional() }).strict(),
]);
const resources = z.array(resourceSchema).max(4, 'Use at most four help resources per step.').optional();
const stepBase = { key: text.min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/), title: text.min(1).max(160), required: z.boolean() };
export const stepSchema = z.discriminatedUnion('type', [
  z.object({ ...stepBase, type: z.literal('INSTRUCTIONS'), config: z.object({ body: text.min(1).max(10000), resources }).strict() }).strict(),
  z.object({ ...stepBase, type: z.literal('COMMAND'), config: z.object({ body: text.max(10000), command: z.string().min(1).max(10000), language: text.max(30).optional(), resources }).strict() }).strict(),
  z.object({ ...stepBase, type: z.literal('CHECKLIST'), config: z.object({ resources, items: z.array(z.object({ id: text.min(1).max(80), label: text.min(1).max(300), required: z.boolean() }).strict()).min(1).max(50).refine(items => new Set(items.map(i => i.id)).size === items.length, 'Checklist IDs must be unique.') }).strict() }).strict(),
  z.object({ ...stepBase, type: z.literal('TEXT_RESPONSE'), config: z.object({ prompt: text.min(1).max(10000), maxLength: z.number().int().min(1).max(5000), resources }).strict() }).strict(),
  z.object({ ...stepBase, type: z.literal('EVIDENCE_UPLOAD'), config: z.object({ instructions: text.min(1).max(10000), minFiles: z.number().int().min(0).max(3), maxFiles: z.number().int().min(1).max(3), resources }).strict().refine(c => c.minFiles <= c.maxFiles, 'Invalid file count.') }).strict(),
]);
export const templateDefinition = z.object({
  title: text.min(1).max(160), description: text.max(5000), category: z.enum(['DATABASE', 'OPERATING_SYSTEMS', 'NETWORKING', 'HARDWARE', 'OTHER']),
  objective: text.min(1).max(5000), prerequisites: text.max(5000), requiredTools: text.max(5000), estimatedMinutes: z.number().int().min(1).max(1440),
  steps: z.array(stepSchema).min(1).max(30).refine(steps => new Set(steps.map(s => s.key)).size === steps.length, 'Step keys must be unique.'),
}).strict();
export type LabStepInput = z.infer<typeof stepSchema>;
export type LabDefinition = z.infer<typeof templateDefinition>;
export const idSchema = text.min(1).max(200);
const date = z.string().datetime({ offset: true }).nullable();
export const assignmentInput = z.object({
  versionId: idSchema, syllabusItemId: idSchema.optional(), title: text.min(1).max(160).optional(), category: text.min(1).max(80).refine(c => c !== 'MATERIAL').optional(),
  maxPoints: z.number().int().min(1).max(100000).optional(), dueDate: date.optional(), opensAt: date.optional(), targetGroupIds: z.array(idSchema).max(50).optional(),
}).strict();
export const assignmentPatch = z.object({ archived: z.boolean().optional(), published: z.boolean().optional(), dueDate: date.optional(), opensAt: date.optional() }).strict();
export const keySchema = z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const submitInput = z.object({ idempotencyKey: keySchema }).strict();
export const reviewInput = z.object({ idempotencyKey: keySchema, decision: z.enum(['NEEDS_REVISION', 'GRADED']), comment: text.min(1).max(10000), score: z.number().finite().min(0).max(100000).optional(), stepId: idSchema.optional(), revisionDueAt: date.optional() }).strict().refine(v => v.decision !== 'GRADED' || v.score !== undefined, 'A grade is required.');
export const reopenInput = z.object({ idempotencyKey: keySchema, comment: text.min(1).max(10000), revisionDueAt: z.string().datetime({ offset: true }) }).strict();

export function parseAnswer(step: LabStepInput, raw: unknown) {
  switch (step.type) {
    case 'INSTRUCTIONS': case 'COMMAND': return z.object({ acknowledged: z.boolean() }).strict().parse(raw);
    case 'TEXT_RESPONSE': return z.object({ text: z.string().max(step.config.maxLength) }).strict().parse(raw);
    case 'CHECKLIST': return z.object({ checkedIds: z.array(z.string()).max(50).refine(ids => new Set(ids).size === ids.length && ids.every(id => step.config.items.some(i => i.id === id)), 'Invalid checklist answer.') }).strict().parse(raw);
    case 'EVIDENCE_UPLOAD': return z.object({}).strict().parse(raw);
  }
}

export function responseComplete(step: LabStepInput, raw: unknown, files = 0): boolean {
  try {
    const answer = parseAnswer(step, raw);
    switch (step.type) {
      case 'INSTRUCTIONS': case 'COMMAND': return 'acknowledged' in answer && answer.acknowledged === true;
      case 'TEXT_RESPONSE': return 'text' in answer && answer.text.trim().length > 0;
      case 'CHECKLIST': return 'checkedIds' in answer && step.config.items.filter(i => i.required).every(i => answer.checkedIds.includes(i.id));
      case 'EVIDENCE_UPLOAD': return files >= step.config.minFiles && files <= step.config.maxFiles;
    }
  } catch { return false; }
}

/** Explicit instructor decisions; never creates a student submission snapshot. */
export const gradebookLabInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('GRADE'), studentId: idSchema, expectedRevision: z.number().int().nonnegative().nullable(), idempotencyKey: keySchema, reason: text.min(1).max(2000), score: z.number().finite().nonnegative().max(99999999).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Use at most two decimal places.') }).strict(),
  z.object({ action: z.literal('REOPEN'), studentId: idSchema, expectedRevision: z.number().int().nonnegative().nullable(), idempotencyKey: keySchema, reason: text.min(1).max(2000), revisionDueAt: z.string().datetime({ offset: true }) }).strict(),
]);
