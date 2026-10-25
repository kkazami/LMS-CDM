import { z } from 'zod';
import { AccessError } from '@/lib/super-user-v1/actor';

const date = z.string().datetime({ offset: true }).transform(value => new Date(value)).nullable();
export const formSettingsSchema = z.object({
  title: z.string().trim().min(1).max(300), description: z.string().max(50000),
  formType: z.enum(['QUIZ', 'MIDTERM_EXAM', 'FINAL_EXAM', 'ACTIVITY']),
  opensAt: date, closesAt: date,
  timeLimitMins: z.number().int().min(1).max(10080).nullable(),
  maxAttempts: z.number().int().min(1).max(100),
  scoreToKeep: z.enum(['HIGHEST', 'LATEST', 'AVERAGE']),
  shuffleQuestions: z.boolean(), shuffleOptions: z.boolean(),
  showScoreAfter: z.boolean(), showAnswersAfter: z.boolean(), showFeedbackAfter: z.boolean(),
  isProctored: z.boolean(), disableCopyPaste: z.boolean(), detectTabSwitch: z.boolean(), lockBrowser: z.boolean(),
  passingScore: z.number().finite().min(0).nullable(),
  themeColor: z.string().max(100).nullable(), headerImageUrl: z.string().max(4000).nullable(),
  confirmationMessage: z.string().max(10000).nullable(),
  password: z.string().refine(value => new TextEncoder().encode(value).length <= 72, 'Form password must not exceed 72 bytes.'),
}).partial();

export function parseFormSettings(body: unknown) {
  const parsed = formSettingsSchema.safeParse(body);
  if (!parsed.success) throw new AccessError(400, parsed.error.issues[0].message);
  return parsed.data;
}

export function checkFormSchedule(form: { opensAt?: Date | null; closesAt?: Date | null }) {
  if (form.opensAt && form.closesAt && form.closesAt <= form.opensAt) throw new AccessError(400, 'Close date and time must be after open date and time.');
}
