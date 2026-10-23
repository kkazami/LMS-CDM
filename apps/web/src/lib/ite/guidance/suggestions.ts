/**
 * apps/web/src/lib/ite/guidance/suggestions.ts
 *
 * Pure rule-based engine generating actionable study suggestions for ITE students.
 * NEVER makes model calls. Uses real course, deadline, risk reason, and focus data.
 * Tone is strictly supportive, specific, and never mentions risk scores, levels, or "at risk".
 */

import type { StudySuggestionsInput, StudySuggestion, DueTaskItem, CourseRiskInput } from "./types";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
  includeCount: boolean = true
): string {
  const form = Math.abs(count) === 1 ? singular : (plural ?? `${singular}s`);
  return includeCount ? `${count} ${form}` : form;
}

export function buildStudySuggestions(input: StudySuggestionsInput): StudySuggestion[] {
  const { instituteCode, tasks, courseRisks, focusSummary } = input;
  const now = input.now ?? new Date();
  const inst = (instituteCode || "ite").toLowerCase();

  const suggestions: StudySuggestion[] = [];

  // 1. Overdue tasks (Priority 1)
  const overdueTasks = tasks.filter((t) => new Date(t.dueDate).getTime() < now.getTime());

  if (overdueTasks.length > 0) {
    // Group overdue by course
    const byCourse = new Map<string, DueTaskItem[]>();
    for (const task of overdueTasks) {
      const list = byCourse.get(task.courseId) || [];
      list.push(task);
      byCourse.set(task.courseId, list);
    }

    for (const [, courseTasks] of byCourse.entries()) {
      const first = courseTasks[0];
      const count = courseTasks.length;
      const courseLabel = first.courseCode || first.courseTitle;

      suggestions.push({
        id: `overdue-${first.courseId}`,
        priority: 1,
        category: "OVERDUE",
        title: count === 1 ? `Overdue: ${first.title}` : `Overdue tasks in ${courseLabel}`,
        detail:
          count === 1
            ? `"${first.title}" in ${courseLabel} is overdue. Submit it soon to keep your progress on track.`
            : `You have ${pluralize(count, "overdue task")} in ${courseLabel}. Start with "${first.title}".`,
        href: `/${inst}/courses/${first.courseId}/classwork/${first.id}`,
      });
    }
  }

  // 2. Tasks due within 48 hours (Priority 2)
  const dueWithin48h = tasks
    .filter((t) => {
      const dueTime = new Date(t.dueDate).getTime();
      return dueTime >= now.getTime() && dueTime - now.getTime() <= FORTY_EIGHT_HOURS_MS;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  for (const task of dueWithin48h) {
    const courseLabel = task.courseCode || task.courseTitle;
    suggestions.push({
      id: `due-soon-${task.id}`,
      priority: 2,
      category: "DUE_SOON",
      title: `Due soon: ${task.title}`,
      detail: `"${task.title}" in ${courseLabel} is due within 48 hours. Review the requirements and draft your work.`,
      href: `/${inst}/courses/${task.courseId}/classwork/${task.id}`,
    });
  }

  // 3. Supportive course engagement nudges mapped from reason codes (Priority 3)
  // NEVER use the word "risk" or show numbers
  for (const cr of courseRisks) {
    const courseLabel = cr.courseCode || cr.courseTitle;
    for (const r of cr.reasons) {
      if (r.code === "LOW_ENGAGEMENT") {
        suggestions.push({
          id: `engage-${cr.courseId}`,
          priority: 3,
          category: "ENGAGEMENT",
          title: `Stay active in ${courseLabel}`,
          detail: `Pick up activity in ${courseLabel}. Check the course stream for recent announcements or review flashcards.`,
          href: `/${inst}/courses/${cr.courseId}/classwork`,
        });
      } else if (r.code === "INACTIVE") {
        suggestions.push({
          id: `inactive-${cr.courseId}`,
          priority: 3,
          category: "ENGAGEMENT",
          title: `Check in to ${courseLabel}`,
          detail: `You haven't visited ${courseLabel} recently. Review newly posted learning materials and lesson notes.`,
          href: `/${inst}/learning-materials/${cr.courseId}`,
        });
      } else if (r.code === "LOW_GRADE") {
        suggestions.push({
          id: `reinforce-${cr.courseId}`,
          priority: 3,
          category: "ENGAGEMENT",
          title: `Review concepts in ${courseLabel}`,
          detail: `Revisit previous assignments and study decks in ${courseLabel} to strengthen your understanding.`,
          href: `/${inst}/courses/${cr.courseId}/classwork`,
        });
      } else if (r.code === "NEW_STUDENT") {
        suggestions.push({
          id: `welcome-${cr.courseId}`,
          priority: 3,
          category: "ENGAGEMENT",
          title: `Explore ${courseLabel}`,
          detail: `Welcome to ${courseLabel}! Browse the syllabus and start with the introductory module.`,
          href: `/${inst}/learning-materials/${cr.courseId}`,
        });
      }
    }
  }

  // 4. Focus Session Nudge (Priority 4)
  if (focusSummary !== null) {
    if (focusSummary.sessionCount === 0) {
      suggestions.push({
        id: "focus-nudge-zero",
        priority: 4,
        category: "FOCUS",
        title: "Start a Focus Session",
        detail: "No study sessions yet this week. Try a 25-minute distraction-free focus block to jumpstart your week.",
        href: `/${inst}/students`,
      });
    } else if (focusSummary.totalMinutes < 30) {
      suggestions.push({
        id: "focus-nudge-low",
        priority: 4,
        category: "FOCUS",
        title: "Keep Up Your Focus Habit",
        detail: `You've logged ${pluralize(focusSummary.totalMinutes, "minute")} of focus this week. A quick 25-minute session today keeps your momentum going.`,
        href: `/${inst}/students`,
      });
    }
  }

  // Deduplicate suggestions by ID
  const seenIds = new Set<string>();
  const uniqueSuggestions: StudySuggestion[] = [];

  // Sort by priority ascending (1 = Overdue, 2 = Due Soon, 3 = Engagement, 4 = Focus, 5 = On track)
  suggestions.sort((a, b) => a.priority - b.priority);

  for (const s of suggestions) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      uniqueSuggestions.push(s);
    }
  }

  // 5. Positive All-Clear State (Priority 5)
  if (uniqueSuggestions.length === 0) {
    uniqueSuggestions.push({
      id: "all-clear-on-track",
      priority: 5,
      category: "ON_TRACK",
      title: "You're on track",
      detail: "No overdue tasks or immediate deadlines. Keep your study streak going and preview upcoming modules.",
      href: `/${inst}/students`,
    });
  }

  // Return at most 3 items
  return uniqueSuggestions.slice(0, 3);
}
