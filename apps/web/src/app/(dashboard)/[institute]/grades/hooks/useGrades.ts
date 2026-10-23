"use client";

// ─── hooks/useGrades.ts ───
// Pure client-side transformation hook delegating to data/grade-filter helper.
// page.tsx drives the real Prisma query; this hook transforms what it receives.

import { useMemo } from "react";
import type { GradeRow, EnrolledCourse } from "../types";
import {
  filterGradeData,
  type PerCourseStats,
  type TrendPoint,
  type FilteredGradeData,
} from "../data/grade-filter";

export type { EnrolledCourse, PerCourseStats, TrendPoint };
export type UseGradesResult = FilteredGradeData;

export function useGrades(
  gradeRows: GradeRow[],
  enrolledCourses: EnrolledCourse[],
  selectedCourseId: string
): UseGradesResult {
  return useMemo(
    () => filterGradeData(gradeRows, enrolledCourses, selectedCourseId),
    [gradeRows, enrolledCourses, selectedCourseId]
  );
}
