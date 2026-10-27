import { z } from 'zod';

export const gradingPeriods = ['MIDTERM', 'FINALS'] as const;
export type GradingPeriod = typeof gradingPeriods[number];
export type ItemPeriod = GradingPeriod | 'UNASSIGNED';
export type CategoryAllocation = { category: string; weightPercentage: number };
export type PeriodPolicy = {
  midtermWeightPercentage: number;
  finalsWeightPercentage: number;
  categoryWeights: Partial<Record<GradingPeriod, CategoryAllocation[]>>;
};
export const defaultPeriodPolicy: PeriodPolicy = { midtermWeightPercentage: 40, finalsWeightPercentage: 60, categoryWeights: {} };
const percentage = z.number().finite().min(0).max(100);
const categoryAllocations = z.array(z.object({ category: z.string().trim().min(1).max(100), weightPercentage: percentage }).strict()).max(50)
  .refine(rows => new Set(rows.map(row => row.category)).size === rows.length, 'Each category may appear only once.')
  .refine(rows => !rows.length || Math.abs(rows.reduce((sum, row) => sum + row.weightPercentage, 0) - 100) < 0.000001, 'Category weights must total 100%.');
export const periodPolicySchema = z.object({
  midtermWeightPercentage: percentage,
  finalsWeightPercentage: percentage,
  categoryWeights: z.object({ MIDTERM: categoryAllocations.optional(), FINALS: categoryAllocations.optional() }).strict(),
}).strict().refine(value => Math.abs(value.midtermWeightPercentage + value.finalsWeightPercentage - 100) < 0.000001, 'Midterm and Finals weights must total 100%.');
export const periodAssignmentsSchema = z.array(z.object({ syllabusItemId: z.string().min(1).max(200), period: z.enum(['MIDTERM', 'FINALS', 'UNASSIGNED']) }).strict()).min(1).max(200)
  .refine(rows => new Set(rows.map(row => row.syllabusItemId)).size === rows.length, 'Each classwork item may appear only once.');

export function resolveItemPeriod(type: string, explicit?: string | null): ItemPeriod {
  if (explicit === 'MIDTERM' || explicit === 'FINALS' || explicit === 'UNASSIGNED') return explicit;
  return type === 'MIDTERM_EXAM' ? 'MIDTERM' : type === 'FINAL_EXAM' ? 'FINALS' : 'UNASSIGNED';
}

type GradableItem = { id: string; type: string; maxPoints: number | null; gradingPeriod?: ItemPeriod };
export type PeriodResult = { percentage: number | null; graded: number; total: number; reason: string | null };
export function calculatePeriodGrades(items: GradableItem[], score: (itemId: string) => number | null | undefined, policy: PeriodPolicy, legacyWeights: CategoryAllocation[] = []) {
  const periods = {} as Record<GradingPeriod, PeriodResult>;
  for (const period of gradingPeriods) {
    const relevant = items.filter(item => (item.gradingPeriod ?? resolveItemPeriod(item.type)) === period);
    const graded = relevant.filter(item => { const value = score(item.id); return typeof value === 'number' && Number.isFinite(value) && value >= 0 && item.maxPoints != null && value <= item.maxPoints; }).length;
    const result: PeriodResult = { percentage: null, graded, total: relevant.length, reason: null };
    if (!relevant.length) result.reason = 'No classwork assigned to this period.';
    else if (graded !== relevant.length) result.reason = 'Every item needs a grade, including an explicit zero where applicable.';
    else if (relevant.some(item => !item.maxPoints || item.maxPoints <= 0)) result.reason = 'Every item needs a positive maximum score.';
    else {
      const weights = policy.categoryWeights[period] ?? legacyWeights;
      if (!weights.length) {
        result.percentage = relevant.reduce((sum, item) => sum + score(item.id)!, 0) / relevant.reduce((sum, item) => sum + item.maxPoints!, 0) * 100;
      } else if (Math.abs(weights.reduce((sum, row) => sum + row.weightPercentage, 0) - 100) > 0.000001 || relevant.some(item => !weights.some(row => row.category === item.type))) {
        result.reason = 'Update the category policy to cover all classwork in this period.';
      } else {
        let earned = 0, applicableWeight = 0;
        for (const weight of weights) {
          const category = relevant.filter(item => item.type === weight.category);
          if (!category.length || weight.weightPercentage === 0) continue;
          earned += category.reduce((sum, item) => sum + score(item.id)!, 0) / category.reduce((sum, item) => sum + item.maxPoints!, 0) * weight.weightPercentage;
          applicableWeight += weight.weightPercentage;
        }
        if (applicableWeight) result.percentage = earned / applicableWeight * 100;
        else result.reason = 'The categories used in this period must have a positive allocation.';
      }
    }
    periods[period] = result;
  }
  const unassigned = items.filter(item => (item.gradingPeriod ?? resolveItemPeriod(item.type)) === 'UNASSIGNED').length;
  const midterm = periods.MIDTERM.percentage, finals = periods.FINALS.percentage;
  const validPolicy = periodPolicySchema.safeParse(policy).success;
  const finalGrade = !unassigned && validPolicy && (policy.midtermWeightPercentage === 0 || midterm != null) && (policy.finalsWeightPercentage === 0 || finals != null)
    ? (midterm ?? 0) * policy.midtermWeightPercentage / 100 + (finals ?? 0) * policy.finalsWeightPercentage / 100 : null;
  return { ...periods, finalGrade, unassigned };
}
