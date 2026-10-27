import { templateDefinition } from '@/lib/labs/schema';

export function draftProblems(value: unknown): { message: string; target: string }[] {
  const result = templateDefinition.safeParse(value);
  if (result.success) return [];
  const labels: Record<string, string> = { title: 'title', objective: 'learning objective', estimatedMinutes: 'estimated time', body: 'instructions', command: 'commands', prompt: 'question', instructions: 'evidence instructions', label: 'checklist text', minFiles: 'minimum files', maxFiles: 'maximum files', maxLength: 'answer length' };
  return result.error.issues.map(issue => {
    const step = issue.path[0] === 'steps' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
    const field = String(issue.path.at(-1) ?? 'steps');
    const label = labels[field] ?? field;
    if (step !== null && issue.path.includes('resources')) return { target: 'lab-step-' + step, message: 'Step ' + (step + 1) + ': check the optional help title/link, or remove the unused help item.' };
    return { target: step === null ? 'lab-' + String(issue.path[0]) : 'lab-step-' + step,
      message: step === null ? 'Check the ' + label + '.' : 'Step ' + (step + 1) + ': add or correct the ' + label + '.' };
  });
}

export function scheduleProblem(start: string, due: string): string | null {
  if (start && !Number.isFinite(new Date(start).getTime())) return 'Choose a valid start date.';
  if (due && !Number.isFinite(new Date(due).getTime())) return 'Choose a valid due date.';
  if (start && due && new Date(due) <= new Date(start)) return 'The due date must be after the start date. Change one of these dates, then try again.';
  return null;
}
