"use client";

// ─── hooks/useGrades.ts ───
// Pure client-side transformation hook. No fetch — data is passed from the server component.
// page.tsx drives the real Prisma query; this hook only transforms what it receives.

import { useMemo } from "react";
import type { GradeRow, EnrolledCourse } from "../types";

export type { EnrolledCourse };

export interface PerCourseStats {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  avgPercent: number;  // 0–100
  itemCount: number;
}

export interface TrendPoint {
  date: string;         // "MMM D" label
  percent: number;      // 0–100
  itemTitle: string;
  courseCode: string;
}

export interface UseGradesResult {
  isEnrolled: boolean;             // student has ≥1 APPROVED enrollment
  hasGradedWork: boolean;          // student has ≥1 graded submission
  filteredRows: GradeRow[];        // rows for the selected course filter
  allRows: GradeRow[];             // all rows across all enrolled courses
  gpa: number;                     // 0.00–4.00
  letterGrade: string;             // A, B, C, D, F
  perCourseStats: PerCourseStats[];
  trendData: TrendPoint[];
}

function calcGPA(rows: GradeRow[]): number {
  if (rows.length === 0) return 0;
  const percents = rows.map((r) => (r.grade / r.maxPoints) * 100);
  const avg = percents.reduce((s, p) => s + p, 0) / percents.length;
  // Convert percentage avg to 4.0 scale
  if (avg >= 97) return 4.0;
  if (avg >= 93) return 4.0;
  if (avg >= 90) return 3.7;
  if (avg >= 87) return 3.3;
  if (avg >= 83) return 3.0;
  if (avg >= 80) return 2.7;
  if (avg >= 77) return 2.3;
  if (avg >= 73) return 2.0;
  if (avg >= 70) return 1.7;
  if (avg >= 67) return 1.3;
  if (avg >= 65) return 1.0;
  return 0.0;
}

function calcLetterGrade(gpa: number): string {
  if (gpa >= 3.7) return "A";
  if (gpa >= 3.3) return "A-/B+";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.7) return "B-/C+";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.0) return "D";
  return "F";
}

function formatDateLabel(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function useGrades(
  gradeRows: GradeRow[],
  enrolledCourses: EnrolledCourse[],
  selectedCourseId: string
): UseGradesResult {
  return useMemo(() => {
    const isEnrolled = enrolledCourses.length > 0;
    const hasGradedWork = gradeRows.length > 0;

    const allRows = gradeRows;

    const filteredRows =
      selectedCourseId === "all"
        ? allRows
        : allRows.filter((r) => r.courseId === selectedCourseId);

    const gpa = calcGPA(allRows);
    const letterGrade = calcLetterGrade(gpa);

    // Per-course stats — only include courses that actually have graded rows
    // (enrolled courses with zero grades are skipped from charts, not shown as 0%)
    const perCourseStats: PerCourseStats[] = enrolledCourses
      .map((course) => {
        const courseRows = allRows.filter((r) => r.courseId === course.id);
        if (courseRows.length === 0) return null;
        const avgPercent =
          courseRows.reduce((s, r) => s + (r.grade / r.maxPoints) * 100, 0) /
          courseRows.length;
        return {
          courseId: course.id,
          courseTitle: course.title,
          courseCode: course.code,
          avgPercent: Math.round(avgPercent * 10) / 10,
          itemCount: courseRows.length,
        };
      })
      .filter((s): s is PerCourseStats => s !== null);

    // Trend data: one point per graded item, chronological
    const trendData: TrendPoint[] = allRows.map((r) => ({
      date: formatDateLabel(r.gradedAt),
      percent: Math.round((r.grade / r.maxPoints) * 100 * 10) / 10,
      itemTitle: r.itemTitle,
      courseCode: r.courseCode,
    }));

    return { isEnrolled, hasGradedWork, filteredRows, allRows, gpa, letterGrade, perCourseStats, trendData };
  }, [gradeRows, enrolledCourses, selectedCourseId]);
}
