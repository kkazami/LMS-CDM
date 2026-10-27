import { labsAvailable } from '@/lib/labs/readiness';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
/**
 * Gradebook Exporter Skill
 *
 * Agentic skill for generating a CSV gradebook export from a course's
 * submission data. Designed to be invoked via the executeSkill() wrapper
 * for standardized logging, timing, and error handling.
 *
 * Output format: RFC 4180 compliant CSV with BOM for Excel compatibility.
 */

import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { administratorCourse } from '@/lib/administrator-scope';
import { requireCourseRelationship } from '@/lib/super-user-v1/actor';
import { db } from "@/lib/db";
import { readPeriodConfiguration } from '@/lib/grading/period-service';
import { calculatePeriodGrades, resolveItemPeriod } from '@/lib/grading/periods';

export interface GradebookExportResult {
  csvContent: string;
  fileName: string;
  studentCount: number;
  assignmentCount: number;
}

export async function exportGradebookSkill(courseId: string): Promise<GradebookExportResult> {
  const actor = await requireLegacyActor("apps/web/src/lib/skills/gradebook-exporter.ts#exportGradebookSkill", { courseId });

  if (canonicalRole(actor.role) === 'ADMIN') await administratorCourse(actor, courseId);
  else await requireCourseRelationship(actor, courseId, true);
  const [course, enrollments, syllabusItems, submissions, periodConfiguration, legacyPolicy] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: { title: true, code: true },
    }),
    db.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: "asc" } },
    }),
    db.syllabusItem.findMany({
      where: { courseId, type: { not: 'MATERIAL' }, maxPoints: { gt: 0 } },
      select: { id: true, title: true, maxPoints: true, type: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    }),
    db.studentSubmission.findMany({
      where: { syllabusItem: { courseId } },
      select: { syllabusItemId: true, studentId: true, grade: true, status: true },
    }),
    readPeriodConfiguration(courseId),
    db.gradingPolicy.findUnique({ where: { courseId }, select: { weights: { select: { category: true, weightPercentage: true } } } }),
  ]);

  const students = enrollments.map((e) => e.student);

  // Build grade lookup map
  const gradeMap = new Map<string, number | null>();
  for (const sub of submissions) {
    gradeMap.set(`${sub.studentId}::${sub.syllabusItemId}`, sub.grade);
  }

  function csvEscape(val: string): string {
    return `"${val.replace(/"/g, '""')}"`;
  }

  // Build CSV rows
  const assignmentHeaders = syllabusItems.map(
    (a) => csvEscape(`[${resolveItemPeriod(a.type, periodConfiguration.assignments[a.id])}] ${a.title} (${a.maxPoints ?? "—"} pts)`)
  );

  const header = [
    csvEscape("Student Name"),
    csvEscape("Email"),
    ...assignmentHeaders,
    csvEscape("Total Points"),
    csvEscape("Total Possible"),
    csvEscape('Midterm (%)'), csvEscape('Finals (%)'), csvEscape(`Final Grade (%) — Midterm ${periodConfiguration.policy.midtermWeightPercentage}% + Finals ${periodConfiguration.policy.finalsWeightPercentage}%`),
  ].join(",");

  const rows = students.map((student) => {
    let totalEarned = 0;
    let totalPossible = 0;

    const gradeCells = syllabusItems.map((a) => {
      const grade = gradeMap.get(`${student.id}::${a.id}`);
      if (grade !== null && grade !== undefined) {
        totalEarned += grade;
        if (a.maxPoints) totalPossible += a.maxPoints;
        return String(grade);
      }
      if (a.maxPoints) totalPossible += a.maxPoints;
      return "";
    });

    const periodGrades = calculatePeriodGrades(syllabusItems.map(item => ({ ...item, gradingPeriod: resolveItemPeriod(item.type, periodConfiguration.assignments[item.id]) })), itemId => gradeMap.get(`${student.id}::${itemId}`), periodConfiguration.policy, legacyPolicy?.weights);
    return [
      csvEscape(student.name),
      csvEscape(student.email),
      ...gradeCells,
      String(totalEarned || ""),
      String(totalPossible || ""),
      periodGrades.MIDTERM.percentage?.toFixed(2) ?? 'Pending', periodGrades.FINALS.percentage?.toFixed(2) ?? 'Pending', periodGrades.finalGrade?.toFixed(2) ?? 'Pending',
    ].join(",");
  });

  // UTF-8 BOM for proper Excel encoding
  const BOM = "\uFEFF";
  const csvContent = BOM + [header, ...rows].join("\n");

  const sanitizedTitle = (course?.title ?? courseId)
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `gradebook-${sanitizedTitle}-${dateStr}.csv`;

  return {
    csvContent,
    fileName,
    studentCount: students.length,
    assignmentCount: syllabusItems.length,
  };
}
