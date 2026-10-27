import { ClipboardList, ListChecks, BookOpenText, Puzzle, MessagesSquare, ClipboardCheck, GraduationCap, Layers3, FlaskConical, type LucideIcon } from 'lucide-react';

type ClassworkAppearance = { icon: LucideIcon; label: string; pluralLabel: string; color: string; badgeClassName: string };
const appearances: Record<string, ClassworkAppearance> = {
  ASSIGNMENT: { icon: ClipboardList, label: 'Assignment', pluralLabel: 'Assignments', color: '#2563EB', badgeClassName: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  QUIZ: { icon: ListChecks, label: 'Quiz', pluralLabel: 'Quizzes', color: '#7C3AED', badgeClassName: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20' },
  MATERIAL: { icon: BookOpenText, label: 'Material', pluralLabel: 'Materials', color: '#059669', badgeClassName: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  ACTIVITY: { icon: Puzzle, label: 'Activity', pluralLabel: 'Activities', color: '#D97706', badgeClassName: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' },
  RECITATION: { icon: MessagesSquare, label: 'Recitation', pluralLabel: 'Recitations', color: '#DB2777', badgeClassName: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20' },
  MIDTERM_EXAM: { icon: ClipboardCheck, label: 'Midterm Exam', pluralLabel: 'Midterm Exams', color: '#DC2626', badgeClassName: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' },
  FINAL_EXAM: { icon: GraduationCap, label: 'Final Exam', pluralLabel: 'Final Exams', color: '#4F46E5', badgeClassName: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' },
};

/** One category vocabulary for course lists, task lists, detail badges, and authoring. */
export function getClassworkAppearance(type: string, practicalLab = false): ClassworkAppearance {
  const customLabel = type === 'CUSTOM' ? 'Custom Classwork' : type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  const category = (Object.hasOwn(appearances, type) ? appearances[type] : undefined) ?? { icon: Layers3, label: customLabel, pluralLabel: type === 'CUSTOM' ? customLabel : customLabel.endsWith('s') ? customLabel : customLabel + 's', color: '#64748B', badgeClassName: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' };
  return practicalLab ? { ...category, icon: FlaskConical, color: '#EA580C', badgeClassName: 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/20' } : category;
}
