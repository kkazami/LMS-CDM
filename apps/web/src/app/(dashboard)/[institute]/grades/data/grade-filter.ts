import type { GradeRow, EnrolledCourse } from "../types";
export type { EnrolledCourse };

import {
  percentToGradePoint,
  computeGwa,
  getGradeRemark,
  isPassing,
} from "../../../../../lib/grading/ph-scale";

export interface PerCourseStats {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  avgPercent: number; // 0–100
  itemCount: number;
  gradePoint: number | null; // 1.00–5.00 on Philippine scale
  remark: "Passed" | "Failed" | "";
}

export interface TrendPoint {
  date: string; // "MMM D" label
  percent: number; // 0–100
  itemTitle: string;
  courseCode: string;
}

export interface FilteredGradeData {
  isEnrolled: boolean;
  hasGradedWork: boolean;
  isAllSubjects: boolean;
  isUnknownCourse: boolean;
  selectedCourseId: string;
  selectedCourse: EnrolledCourse | null;
  filteredRows: GradeRow[];
  allRows: GradeRow[];
  gwa: number | null;
  gwaRemark: "Passed" | "Failed" | "";
  isGwaPassing: boolean;
  overallPercent: number;
  perCourseStats: PerCourseStats[];
  trendData: TrendPoint[];
}

export function formatDateLabel(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Pure helper for filtering student grades by subject, computing per-subject statistics,
 * GWA, trend points, and empty states.
 *
 * Scenarios handled:
 * 1. "all" (All subjects): combined GWA across enrolled subjects with graded work,
 *    all graded items, all trend points, per-course breakdown.
 * 2. Valid enrolled course with grades: filtered to that subject only, GWA equals that course's
 *    grade point, only that subject's items/stats/trends.
 * 3. Enrolled course with NO graded work: hasGradedWork = false, empty rows, stats, and trends.
 * 4. Unknown subject ID (not in student's enrolled courses): isUnknownCourse = true,
 *    hasGradedWork = false, empty rows, stats, and trends.
 */
export function filterGradeData(
  gradeRows: GradeRow[],
  enrolledCourses: EnrolledCourse[],
  selectedCourseId: string = "all"
): FilteredGradeData {
  const isEnrolled = enrolledCourses.length > 0;
  const normalizedCourseId = selectedCourseId || "all";
  const isAllSubjects = normalizedCourseId === "all";

  // Check if course is enrolled
  const matchingCourse = enrolledCourses.find((c) => c.id === normalizedCourseId) ?? null;
  const isUnknownCourse = !isAllSubjects && !matchingCourse;

  if (isUnknownCourse) {
    return {
      isEnrolled,
      hasGradedWork: false,
      isAllSubjects: false,
      isUnknownCourse: true,
      selectedCourseId: normalizedCourseId,
      selectedCourse: null,
      filteredRows: [],
      allRows: gradeRows,
      gwa: null,
      gwaRemark: "",
      isGwaPassing: false,
      overallPercent: 0,
      perCourseStats: [],
      trendData: [],
    };
  }

  if (isAllSubjects) {
    const allRows = gradeRows;
    const hasGradedWork = allRows.length > 0;

    // Per-course stats across all enrolled courses with grades
    const perCourseStats: PerCourseStats[] = enrolledCourses
      .map((course) => {
        const courseRows = allRows.filter((r) => r.courseId === course.id);
        if (courseRows.length === 0) return null;
        const avgPercent =
          courseRows.reduce((s, r) => s + (r.grade / r.maxPoints) * 100, 0) /
          courseRows.length;
        const roundedAvg = Math.round(avgPercent * 10) / 10;
        const gradePoint = percentToGradePoint(roundedAvg);
        const remark = getGradeRemark(gradePoint);

        return {
          courseId: course.id,
          courseTitle: course.title,
          courseCode: course.code,
          avgPercent: roundedAvg,
          itemCount: courseRows.length,
          gradePoint,
          remark,
        };
      })
      .filter((s): s is PerCourseStats => s !== null);

    const overallPercent =
      allRows.length === 0
        ? 0
        : allRows.reduce((s, r) => s + (r.grade / r.maxPoints) * 100, 0) / allRows.length;

    const courseGradePoints = perCourseStats
      .map((s) => s.gradePoint)
      .filter((gp): gp is number => gp !== null);

    const gwa =
      courseGradePoints.length > 0
        ? computeGwa(courseGradePoints)
        : hasGradedWork
        ? percentToGradePoint(overallPercent)
        : null;

    const gwaRemark = getGradeRemark(gwa);
    const isGwaPassing = isPassing(gwa);

    const trendData: TrendPoint[] = allRows.map((r) => ({
      date: formatDateLabel(r.gradedAt),
      percent: Math.round((r.grade / r.maxPoints) * 100 * 10) / 10,
      itemTitle: r.itemTitle,
      courseCode: r.courseCode,
    }));

    return {
      isEnrolled,
      hasGradedWork,
      isAllSubjects: true,
      isUnknownCourse: false,
      selectedCourseId: "all",
      selectedCourse: null,
      filteredRows: allRows,
      allRows,
      gwa,
      gwaRemark,
      isGwaPassing,
      overallPercent: Math.round(overallPercent * 10) / 10,
      perCourseStats,
      trendData,
    };
  }

  // Specific enrolled subject selected
  const courseRows = gradeRows.filter((r) => r.courseId === normalizedCourseId);
  const hasGradedWork = courseRows.length > 0;

  if (!hasGradedWork) {
    return {
      isEnrolled,
      hasGradedWork: false,
      isAllSubjects: false,
      isUnknownCourse: false,
      selectedCourseId: normalizedCourseId,
      selectedCourse: matchingCourse,
      filteredRows: [],
      allRows: gradeRows,
      gwa: null,
      gwaRemark: "",
      isGwaPassing: false,
      overallPercent: 0,
      perCourseStats: [],
      trendData: [],
    };
  }

  const avgPercent =
    courseRows.reduce((s, r) => s + (r.grade / r.maxPoints) * 100, 0) / courseRows.length;
  const roundedAvg = Math.round(avgPercent * 10) / 10;
  const gradePoint = percentToGradePoint(roundedAvg);
  const remark = getGradeRemark(gradePoint);

  const courseStat: PerCourseStats = {
    courseId: matchingCourse!.id,
    courseTitle: matchingCourse!.title,
    courseCode: matchingCourse!.code,
    avgPercent: roundedAvg,
    itemCount: courseRows.length,
    gradePoint,
    remark,
  };

  const trendData: TrendPoint[] = courseRows.map((r) => ({
    date: formatDateLabel(r.gradedAt),
    percent: Math.round((r.grade / r.maxPoints) * 100 * 10) / 10,
    itemTitle: r.itemTitle,
    courseCode: r.courseCode,
  }));

  return {
    isEnrolled,
    hasGradedWork: true,
    isAllSubjects: false,
    isUnknownCourse: false,
    selectedCourseId: normalizedCourseId,
    selectedCourse: matchingCourse,
    filteredRows: courseRows,
    allRows: gradeRows,
    gwa: gradePoint,
    gwaRemark: remark,
    isGwaPassing: isPassing(gradePoint),
    overallPercent: roundedAvg,
    perCourseStats: [courseStat],
    trendData,
  };
}
