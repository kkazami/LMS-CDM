export function recordedScoreInPoints<T extends number | null>(grade: T, status: string | null, isForm: boolean, maxPoints: number | null): number | T {
  // Older form syncs stored percentages. Convert only values that cannot already be points.
  if (grade != null && status === 'SUBMITTED' && isForm && maxPoints != null && maxPoints > 0 && grade > maxPoints && grade <= 100) {
    return Math.round(grade * maxPoints) / 100;
  }
  return grade;
}
