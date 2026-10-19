/**
 * Gradebook Exporter Skill
 *
 * Agentic skill for generating a CSV gradebook export from a course's
 * submission data. Designed to be invoked via the executeSkill() wrapper
 * for standardized logging, timing, and error handling.
 *
 * Output format: RFC 4180 compliant CSV with BOM for Excel compatibility.
 */

import { db } from "@/lib/db";

export interface GradebookExportResult {
  csvContent: string;
  fileName: string;
  studentCount: number;
  assignmentCount: number;
}

export async function exportGradebookSkill(courseId: string): Promise<GradebookExportResult> {
  const [course, enrollments, syllabusItems, submissions] = await Promise.all([
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
      where: { courseId, type: { in: ["ASSIGNMENT", "QUIZ"] } },
      select: { id: true, title: true, maxPoints: true, type: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    }),
    db.studentSubmission.findMany({
      where: { syllabusItem: { courseId } },
      select: { syllabusItemId: true, studentId: true, grade: true, status: true },
    }),
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
    (a) => csvEscape(`${a.title} (${a.maxPoints ?? "—"} pts)`)
  );

  const header = [
    csvEscape("Student Name"),
    csvEscape("Email"),
    ...assignmentHeaders,
    csvEscape("Total Points"),
    csvEscape("Total Possible"),
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

    return [
      csvEscape(student.name),
      csvEscape(student.email),
      ...gradeCells,
      String(totalEarned || ""),
      String(totalPossible || ""),
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
