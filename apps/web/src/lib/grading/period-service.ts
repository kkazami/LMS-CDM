import { db } from '@/lib/db';
import { lockSyllabusItem } from '@/lib/academic-task';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { AccessError } from '@/lib/super-user-v1/actor';
import { defaultPeriodPolicy, periodAssignmentsSchema, periodPolicySchema, type PeriodPolicy } from './periods';

export async function readPeriodConfiguration(courseId: string) {
  try {
    const [policy, assignments] = await Promise.all([
      db.courseGradebookPolicy.findUnique({ where: { courseId } }),
      db.classworkGradingPeriod.findMany({ where: { syllabusItem: { courseId } }, select: { syllabusItemId: true, period: true } }),
    ]);
    const parsed = policy ? periodPolicySchema.safeParse(policy && { midtermWeightPercentage: policy.midtermWeightPercentage, finalsWeightPercentage: policy.finalsWeightPercentage, categoryWeights: policy.categoryWeights }) : null;
    if (parsed && !parsed.success) throw new AccessError(409, 'The saved period policy needs administrator review.');
    return { available: true, policy: parsed?.success ? parsed.data : defaultPeriodPolicy, assignments: Object.fromEntries(assignments.map(row => [row.syllabusItemId, row.period])) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2021') return { available: false, policy: defaultPeriodPolicy, assignments: {} as Record<string, string> };
    throw error;
  }
}

export async function savePeriodPolicy(actor: CourseActor, courseId: string, input: unknown) {
  await requireCourseAccess(actor, courseId, true);
  const parsed = periodPolicySchema.safeParse(input);
  if (!parsed.success) throw new AccessError(400, parsed.error.issues[0]?.message ?? 'Invalid grading policy.');
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`;
    await requireCourseAccess(actor, courseId, true, tx);
    const data = { ...parsed.data, categoryWeights: JSON.parse(JSON.stringify(parsed.data.categoryWeights)) };
    await tx.courseGradebookPolicy.upsert({ where: { courseId }, create: { courseId, ...data }, update: data });
  });
  return parsed.data as PeriodPolicy;
}

export async function savePeriodAssignments(actor: CourseActor, courseId: string, input: unknown) {
  await requireCourseAccess(actor, courseId, true);
  const parsed = periodAssignmentsSchema.safeParse(input);
  if (!parsed.success) throw new AccessError(400, parsed.error.issues[0]?.message ?? 'Invalid period assignments.');
  await db.$transaction(async tx => {
    for (const row of [...parsed.data].sort((a, b) => a.syllabusItemId.localeCompare(b.syllabusItemId))) await lockSyllabusItem(tx, row.syllabusItemId);
    await requireCourseAccess(actor, courseId, true, tx);
    const items = await tx.syllabusItem.findMany({ where: { id: { in: parsed.data.map(row => row.syllabusItemId) }, courseId, type: { not: 'MATERIAL' }, maxPoints: { gt: 0 } }, select: { id: true } });
    if (items.length !== parsed.data.length) throw new AccessError(404, 'Some classwork does not belong to this course or has no positive point value.');
    for (const row of parsed.data) await tx.classworkGradingPeriod.upsert({ where: { syllabusItemId: row.syllabusItemId }, create: row, update: { period: row.period } });
  }, { timeout: 15000 });
}
