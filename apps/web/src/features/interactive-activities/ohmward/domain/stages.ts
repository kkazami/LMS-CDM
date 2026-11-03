export const STAGES = ['Learn', 'Try', 'Build', 'Prove', 'Review'] as const;

/** Local learning sequence is guidance only. The server independently enforces level access and grading. */
export function stageLocks({ unlocked, preview, furthest, hasAttempt, submitted }: { unlocked: boolean; preview: boolean; furthest: number; hasAttempt: boolean; submitted: boolean }): (string | null)[] {
  const reached = Math.max(furthest, hasAttempt ? 2 : 0);
  return [null, reached >= 1 ? null : 'Finish Learn first',
    !unlocked && !preview ? 'Pass the prerequisite first' : reached >= 2 ? null : 'Finish Try first',
    !unlocked && !preview ? 'Pass the prerequisite first' : submitted || reached >= 3 ? null : 'Finish Build first',
    submitted ? null : 'Submit in Prove first'];
}
