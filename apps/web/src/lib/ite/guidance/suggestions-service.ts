/**
 * apps/web/src/lib/ite/guidance/suggestions-service.ts
 *
 * Data loader aggregating real course deadlines, risk reasons, and focus metrics
 * for the current student, then delegating to pure buildStudySuggestions.
 */

import { db } from "@/lib/db";
import { computeFocusSummary } from "@/lib/ite/focus/service";
import { buildStudySuggestions } from "./suggestions";
import type { StudySuggestion, DueTaskItem, CourseRiskInput } from "./types";

export async function getStudentStudySuggestions({
  studentId,
  instituteCode = "ite",
  now = new Date(),
}: {
  studentId: string;
  instituteCode?: string;
  now?: Date;
}): Promise<StudySuggestion[]> {
  // 1. Get student's approved enrollments in ITE courses
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId,
      status: "APPROVED",
      course: {
        isArchived: false,
        institute: { code: { equals: instituteCode, mode: "insensitive" } },
      },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
        },
      },
    },
  });

  if (enrollments.length === 0) {
    return buildStudySuggestions({
      instituteCode,
      tasks: [],
      courseRisks: [],
      focusSummary: null,
      now,
    });
  }

  const courseIds = enrollments.map((e) => e.course.id);

  // 2. Fetch classwork submissions, due tasks, course risk assessments, and focus metrics in parallel
  const [submissions, rawDueTasks, risks, focusSummary] = await Promise.all([
    db.studentSubmission.findMany({
      where: {
        studentId,
        syllabusItem: { courseId: { in: courseIds } },
      },
      select: { syllabusItemId: true, status: true },
    }),
    db.syllabusItem.findMany({
      where: {
        courseId: { in: courseIds },
        type: { not: "MATERIAL" },
        dueDate: { not: null },
        OR: [
          { targetGroups: { none: {} } },
          { targetGroups: { some: { group: { members: { some: { studentId } } } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        course: {
          select: { id: true, title: true, code: true, section: true },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.riskAssessment.findMany({
      where: {
        studentId,
        courseId: { in: courseIds },
      },
      select: {
        courseId: true,
        reasons: true,
        course: { select: { id: true, title: true, code: true } },
      },
    }),
    computeFocusSummary(studentId, db, now).catch(() => null),
  ]);

  // 3. Filter unsubmitted tasks
  const submittedSet = new Set(
    submissions
      .filter((s) => ["SUBMITTED", "GRADED", "RETURNED"].includes(s.status))
      .map((s) => s.syllabusItemId)
  );

  const pendingTasks: DueTaskItem[] = rawDueTasks
    .filter((t) => t.dueDate && !submittedSet.has(t.id))
    .map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      dueDate: t.dueDate!.toISOString(),
      courseId: t.course.id,
      courseTitle: t.course.title,
      courseCode: t.course.code,
      courseSection: t.course.section,
    }));

  // 4. Parse risk reasons
  const courseRisks: CourseRiskInput[] = risks.map((r) => ({
    courseId: r.courseId,
    courseTitle: r.course.title,
    courseCode: r.course.code,
    reasons: Array.isArray(r.reasons) ? (r.reasons as unknown as CourseRiskInput["reasons"]) : [],
  }));

  // 5. Structure focus summary
  const focusInput = focusSummary
    ? {
        totalMinutes: focusSummary.focusedMinutesThisWeek,
        sessionCount: focusSummary.completedSessionsThisWeek,
      }
    : null;

  // 6. Build suggestions
  return buildStudySuggestions({
    instituteCode,
    tasks: pendingTasks,
    courseRisks,
    focusSummary: focusInput,
    now,
  });
}
