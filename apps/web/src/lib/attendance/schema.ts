import { z } from 'zod';

const id = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const reason = z.string().trim().min(1).max(500);
const status = z.enum(['PRESENT', 'TARDY', 'ABSENT', 'EXCUSED']);
const revision = z.number().int().nonnegative();
const days = z.number().int().min(1).max(36500).nullable();
export const policySchema = z.object({
  rollout: z.enum(['DISABLED', 'PILOT', 'ENABLED']), phase: z.number().int().min(1).max(3), pilotCourseIds: z.array(id).max(500),
  locationEnabled: z.boolean(), timezone: z.string().max(80).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Use an IANA timezone.'),
  privacyReview: z.string().trim().max(500), recordDays: days, eventDays: days, requestDays: days, verificationDays: days, arrangementDays: days,
}).strict().superRefine((value, ctx) => {
  if (value.locationEnabled && (!value.privacyReview || value.verificationDays === null)) ctx.addIssue({ code: 'custom', message: 'A privacy review and verification retention period are required before enabling location.' });
  if (value.eventDays !== null && value.recordDays !== null && value.eventDays < value.recordDays) ctx.addIssue({ code: 'custom', message: 'Correction events must remain for at least the academic record lifetime.' });
});
export const settingsSchema = z.object({ liveLimit: z.number().int().min(1).max(10), asyncLimit: z.number().int().min(1).max(10), absenceThreshold: z.number().int().min(2).max(20), tardyThreshold: z.number().int().min(2).max(20), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), locationLabel: z.string().trim().max(100) }).strict().refine(value => (value.latitude === null) === (value.longitude === null), 'Provide both location coordinates.');
export const createSchema = z.object({
  title: z.string().trim().min(1).max(120), instructions: z.string().trim().max(1000).default(''),
  mode: z.enum(['IN_PERSON', 'LIVE_REMOTE', 'ASYNCHRONOUS']), durationMinutes: z.number().int().min(1).max(10080), presentMinutes: z.number().int().min(0).max(10080).optional(),
  qrGraceSeconds: z.number().int().min(3).max(60).default(30), liveCodeEnabled: z.boolean().default(false), requiresLocation: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), radius: z.number().int().min(100).max(500).default(150),
}).strict().superRefine((value, ctx) => {
  if (value.mode !== 'ASYNCHRONOUS' && value.durationMinutes > 480) ctx.addIssue({ code: 'custom', message: 'Live sessions allow up to 480 minutes.' });
  if (value.presentMinutes !== undefined && value.presentMinutes > value.durationMinutes) ctx.addIssue({ code: 'custom', message: 'The Present cutoff must be within the session.' });
  if (value.mode !== 'IN_PERSON' && value.requiresLocation) ctx.addIssue({ code: 'custom', message: 'Remote sessions cannot require location.' });
  if (value.liveCodeEnabled && value.mode !== 'LIVE_REMOTE') ctx.addIssue({ code: 'custom', message: 'A live code is only available for live remote sessions.' });
  if ((value.latitude === undefined) !== (value.longitude === undefined)) ctx.addIssue({ code: 'custom', message: 'Provide both location coordinates.' });
});
const location = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().finite().min(0).max(100000), timestamp: z.number().finite(), mocked: z.boolean().optional() }).strict().optional();
export const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('CREATE_SESSION'), input: createSchema }).strict(),
  z.object({ action: z.literal('CHECK_IN'), sessionId: id, token: z.string().max(2000).optional(), code: z.string().max(12).optional(), challenge: z.string().max(2000).optional(), location }).strict(),
  z.object({ action: z.literal('REQUEST'), sessionId: id, reason: z.string().trim().max(500).optional(), challenge: z.string().max(2000).optional(), location }).strict(),
  z.object({ action: z.enum(['END', 'CANCEL', 'REGENERATE']), sessionId: id }).strict(),
  z.object({ action: z.literal('MARK'), sessionId: id, recordId: id, status, reason, revision }).strict(),
  z.object({ action: z.literal('ADD_STUDENT'), sessionId: id, studentId: id, reason }).strict(),
  z.object({ action: z.literal('DECIDE'), sessionId: id, requestId: id, revision, accept: z.boolean(), status: status.optional(), reason: z.string().trim().max(500).optional() }).strict(),
  z.object({ action: z.literal('ACCEPT_ALL'), sessionId: id, requests: z.array(z.object({ id, revision }).strict()).min(1).max(500), acknowledgeUnverified: z.boolean() }).strict(),
  z.object({ action: z.literal('SETTINGS'), settings: settingsSchema }).strict(),
  z.object({ action: z.literal('POLICY'), policy: policySchema }).strict(),
  z.object({ action: z.literal('ARRANGEMENT'), studentId: id, enabled: z.boolean() }).strict(),
  z.object({ action: z.literal('GRANT'), userId: id }).strict(),
  z.object({ action: z.literal('REVOKE'), grantId: id }).strict(),
  z.object({ action: z.literal('HOLD'), sessionId: id, enabled: z.boolean(), reason }).strict(),
]);
export type Mutation = z.infer<typeof mutationSchema>;
