import type { Grade, GradeSummary } from '@lms/types';
import {
  percentToGradePoint,
  computeGwa,
  isPassing,
  getGradeRemark,
} from './ph-scale';

export interface EnrolledCourseLike {
  id: string;
  title: string;
  code: string;
}

export interface PerSubjectStat {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  earnedPoints: number;
  totalPoints: number;
  avgPercent: number; // 0–100
  itemCount: number;
  gradePoint: number | null;
  remark: 'Passed' | 'Failed' | '';
}

export interface FilteredMobileGradeData {
  isAllSubjects: boolean;
  selectedCourseId: string;
  selectedCourse: EnrolledCourseLike | null;
  filteredGrades: Grade[];
  filteredSummaries: GradeSummary[];
  perSubjectStats: PerSubjectStat[];
  gwa: number | null;
  gwaRemark: 'Passed' | 'Failed' | '';
  isGwaPassing: boolean;
  overallPercent: number;
  hasGradedWork: boolean;
  isUnknownCourse: boolean;
  milestones: Grade[];
}

export function getPercent(grade: Grade): number {
  if (!grade.maxValue || grade.maxValue <= 0) return Math.round(grade.value);
  return Math.round((grade.value / grade.maxValue) * 100 * 10) / 10;
}

/**
 * Pure helper for filtering mobile student grades by subject, computing per-subject statistics,
 * GWA, trend data, recent milestones, and empty states.
 *
 * Keeps exact parity with the web grades filtering logic:
 * - "all" = combined view across enrolled subjects with graded work
 * - Specific subject = filtered to that subject only, GWA equals that subject's grade point
 * - Subject with no grades = hasGradedWork = false, empty rows and null GWA
 * - Unknown subject ID = isUnknownCourse = true, hasGradedWork = false
 */
export function filterMobileGradeData(
  grades: Grade[],
  summaries: GradeSummary[] = [],
  enrolledCourses: EnrolledCourseLike[] = [],
  selectedCourseId: string = 'all'
): FilteredMobileGradeData {
  const normalizedCourseId = selectedCourseId || 'all';
  const isAllSubjects = normalizedCourseId === 'all';

  const matchingCourse = enrolledCourses.find((c) => c.id === normalizedCourseId) ?? null;
  const isUnknownCourse = !isAllSubjects && !matchingCourse;

  if (isUnknownCourse) {
    return {
      isAllSubjects: false,
      selectedCourseId: normalizedCourseId,
      selectedCourse: null,
      filteredGrades: [],
      filteredSummaries: [],
      perSubjectStats: [],
      gwa: null,
      gwaRemark: '',
      isGwaPassing: false,
      overallPercent: 0,
      hasGradedWork: false,
      isUnknownCourse: true,
      milestones: [],
    };
  }

  if (isAllSubjects) {
    const hasGradedWork = grades.length > 0;

    // Per-subject stats for all enrolled courses with graded work
    const perSubjectStats: PerSubjectStat[] = enrolledCourses
      .map((course) => {
        const courseGrades = grades.filter((g) => g.courseId === course.id);
        if (courseGrades.length === 0) return null;

        const avgPercent =
          courseGrades.reduce((sum, g) => sum + getPercent(g), 0) / courseGrades.length;
        const roundedAvg = Math.round(avgPercent * 10) / 10;
        const gradePoint = percentToGradePoint(roundedAvg);
        const remark = getGradeRemark(gradePoint);

        const earnedPoints = courseGrades.reduce((sum, g) => sum + (Number(g.value) || 0), 0);
        const totalPoints = courseGrades.reduce((sum, g) => sum + (Number(g.maxValue) || 0), 0);

        return {
          courseId: course.id,
          courseCode: course.code,
          courseTitle: course.title,
          earnedPoints: Math.round(earnedPoints * 10) / 10,
          totalPoints: Math.round(totalPoints * 10) / 10,
          avgPercent: roundedAvg,
          itemCount: courseGrades.length,
          gradePoint,
          remark,
        };
      })
      .filter((s): s is PerSubjectStat => s !== null);

    const overallPercent =
      grades.length === 0
        ? 0
        : Math.round((grades.reduce((sum, g) => sum + getPercent(g), 0) / grades.length) * 10) / 10;

    const courseGradePoints = perSubjectStats
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

    const milestones = [...grades]
      .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
      .slice(0, 6);

    return {
      isAllSubjects: true,
      selectedCourseId: 'all',
      selectedCourse: null,
      filteredGrades: grades,
      filteredSummaries: summaries,
      perSubjectStats,
      gwa,
      gwaRemark,
      isGwaPassing,
      overallPercent,
      hasGradedWork,
      isUnknownCourse: false,
      milestones,
    };
  }

  // Single Subject Selected
  const courseGrades = grades.filter((g) => g.courseId === normalizedCourseId);
  const hasGradedWork = courseGrades.length > 0;

  if (!hasGradedWork) {
    return {
      isAllSubjects: false,
      selectedCourseId: normalizedCourseId,
      selectedCourse: matchingCourse,
      filteredGrades: [],
      filteredSummaries: summaries.filter((s) => s.courseId === normalizedCourseId),
      perSubjectStats: [],
      gwa: null,
      gwaRemark: '',
      isGwaPassing: false,
      overallPercent: 0,
      hasGradedWork: false,
      isUnknownCourse: false,
      milestones: [],
    };
  }

  const avgPercent =
    courseGrades.reduce((sum, g) => sum + getPercent(g), 0) / courseGrades.length;
  const roundedAvg = Math.round(avgPercent * 10) / 10;
  const gradePoint = percentToGradePoint(roundedAvg);
  const remark = getGradeRemark(gradePoint);

  const earnedPoints = courseGrades.reduce((sum, g) => sum + (Number(g.value) || 0), 0);
  const totalPoints = courseGrades.reduce((sum, g) => sum + (Number(g.maxValue) || 0), 0);

  const singleStat: PerSubjectStat = {
    courseId: matchingCourse!.id,
    courseCode: matchingCourse!.code,
    courseTitle: matchingCourse!.title,
    earnedPoints: Math.round(earnedPoints * 10) / 10,
    totalPoints: Math.round(totalPoints * 10) / 10,
    avgPercent: roundedAvg,
    itemCount: courseGrades.length,
    gradePoint,
    remark,
  };

  const milestones = [...courseGrades]
    .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
    .slice(0, 6);

  return {
    isAllSubjects: false,
    selectedCourseId: normalizedCourseId,
    selectedCourse: matchingCourse,
    filteredGrades: courseGrades,
    filteredSummaries: summaries.filter((s) => s.courseId === normalizedCourseId),
    perSubjectStats: [singleStat],
    gwa: gradePoint,
    gwaRemark: remark,
    isGwaPassing: isPassing(gradePoint),
    overallPercent: roundedAvg,
    hasGradedWork: true,
    isUnknownCourse: false,
    milestones,
  };
}
