/**
 * Philippine Collegiate Grading Scale & GWA Computation Module for Mobile
 *
 * Source of Truth: apps/web/src/lib/grading/ph-scale.ts
 *
 * THE SCALE (Default; editable constant to be confirmed with registrar):
 * Percentage -> Grade Point (lower is better; lower bound of each band is inclusive):
 * >= 96 -> 1.00
 * >= 94 -> 1.25
 * >= 92 -> 1.50
 * >= 89 -> 1.75
 * >= 87 -> 2.00
 * >= 84 -> 2.25
 * >= 82 -> 2.50
 * >= 79 -> 2.75
 * >= 75 -> 3.00
 * <  75 -> 5.00
 *
 * Passing = grade point <= 3.00.
 * The percentage remains the canonical stored and computed value.
 * The grade point and remarks ("Passed" / "Failed") are derived for display only.
 */

export interface GradeBand {
  minPercent: number;
  gradePoint: number;
}

/**
 * Single source of truth for the Philippine collegiate grading scale.
 * Ordered descending by minPercent.
 */
export const PHILIPPINE_GRADING_SCALE: readonly GradeBand[] = [
  { minPercent: 96, gradePoint: 1.00 },
  { minPercent: 94, gradePoint: 1.25 },
  { minPercent: 92, gradePoint: 1.50 },
  { minPercent: 89, gradePoint: 1.75 },
  { minPercent: 87, gradePoint: 2.00 },
  { minPercent: 84, gradePoint: 2.25 },
  { minPercent: 82, gradePoint: 2.50 },
  { minPercent: 79, gradePoint: 2.75 },
  { minPercent: 75, gradePoint: 3.00 },
  { minPercent: 0,  gradePoint: 5.00 },
] as const;

export const PASSING_GRADE_POINT_THRESHOLD = 3.00;

const passingBands = PHILIPPINE_GRADING_SCALE.filter(
  (b) => b.gradePoint <= PASSING_GRADE_POINT_THRESHOLD
);

/**
 * The highest possible collegiate grade point (1.00 on the Philippine scale).
 * Derived from PHILIPPINE_GRADING_SCALE.
 */
export const HIGHEST_GRADE_POINT = Math.min(
  ...PHILIPPINE_GRADING_SCALE.map((b) => b.gradePoint)
);

/**
 * The lowest passing grade point (3.00 on the Philippine scale).
 * Derived from PHILIPPINE_GRADING_SCALE and PASSING_GRADE_POINT_THRESHOLD.
 */
export const LOWEST_PASSING_GRADE_POINT = passingBands.length > 0
  ? Math.max(...passingBands.map((b) => b.gradePoint))
  : PASSING_GRADE_POINT_THRESHOLD;

/**
 * The minimum percentage that achieves a passing grade point (75% on the default scale).
 * Derived from PHILIPPINE_GRADING_SCALE and PASSING_GRADE_POINT_THRESHOLD.
 */
export const PASSING_MIN_PERCENT = passingBands.length > 0
  ? Math.min(...passingBands.map((b) => b.minPercent))
  : 75;


/**
 * Converts a raw percentage (0–100) to its Philippine collegiate grade point (1.00–5.00).
 * Handles null, undefined, NaN, and values outside 0-100 safely.
 * Returns null when there is no graded data.
 */
export function percentToGradePoint(percent: number | null | undefined): number | null {
  if (percent === null || percent === undefined || typeof percent !== "number" || isNaN(percent)) {
    return null;
  }

  // Clamp percentages: values > 100 clamp to 100, values < 0 clamp to 0
  const clamped = Math.max(0, Math.min(100, percent));

  for (const band of PHILIPPINE_GRADING_SCALE) {
    if (clamped >= band.minPercent) {
      return band.gradePoint;
    }
  }

  return 5.00;
}

/**
 * Determines whether a grade point represents a passing grade (<= 3.00).
 */
export function isPassing(gradePoint: number | null | undefined): boolean {
  if (gradePoint === null || gradePoint === undefined || typeof gradePoint !== "number" || isNaN(gradePoint)) {
    return false;
  }
  return gradePoint <= PASSING_GRADE_POINT_THRESHOLD;
}

/**
 * Formats a grade point to 2 decimal places (e.g. "1.00", "1.75", "5.00").
 * Returns "—" if null, undefined, or NaN.
 */
export function formatGradePoint(gradePoint: number | null | undefined): string {
  if (gradePoint === null || gradePoint === undefined || typeof gradePoint !== "number" || isNaN(gradePoint)) {
    return "—";
  }
  return gradePoint.toFixed(2);
}

/**
 * Returns the official remark for a grade point: "Passed" or "Failed".
 * Returns empty string if no grade point is provided.
 */
export function getGradeRemark(gradePoint: number | null | undefined): "Passed" | "Failed" | "" {
  if (gradePoint === null || gradePoint === undefined || typeof gradePoint !== "number" || isNaN(gradePoint)) {
    return "";
  }
  return isPassing(gradePoint) ? "Passed" : "Failed";
}

export type GwaCourseInput =
  | number
  | { gradePoint: number | null | undefined; units?: number | null };

/**
 * Computes the General Weighted Average (GWA) from a collection of per-course grade points.
 * If course units/credits are provided (> 0), weights by units.
 * Otherwise (or if course units do not exist in the data model), weights equally as the arithmetic mean.
 * Returns null when there are no valid courses.
 */
export function computeGwa(courses: GwaCourseInput[]): number | null {
  if (!courses || courses.length === 0) {
    return null;
  }

  let totalWeighted = 0;
  let totalUnits = 0;
  let hasValidUnits = false;
  const validPoints: number[] = [];

  for (const item of courses) {
    if (typeof item === "number") {
      if (!isNaN(item)) {
        validPoints.push(item);
      }
    } else if (item && typeof item === "object") {
      const gp = item.gradePoint;
      if (gp !== null && gp !== undefined && !isNaN(gp)) {
        const u = item.units;
        if (typeof u === "number" && !isNaN(u) && u > 0) {
          hasValidUnits = true;
          totalWeighted += gp * u;
          totalUnits += u;
        }
        validPoints.push(gp);
      }
    }
  }

  if (validPoints.length === 0) {
    return null;
  }

  // If unit weights are present and non-zero across courses, use unit-weighted average
  if (hasValidUnits && totalUnits > 0) {
    return totalWeighted / totalUnits;
  }

  // Otherwise, weight equally as average of per-course grade points
  const sum = validPoints.reduce((acc, p) => acc + p, 0);
  return sum / validPoints.length;
}

export interface GradeLikeItem {
  value: number;
  maxValue: number;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
}

export interface CourseSummaryLike {
  percentage: number;
  gradeCount: number;
  courseId?: string;
}

/**
 * Computes the GWA by grouping grades by course, converting each course's
 * percentage to a grade point, and averaging those course grade points.
 *
 * This ensures exact parity across the student dashboard, grades tab, and web app.
 */
export function computeGwaFromCourses(input: {
  summaries?: CourseSummaryLike[] | null;
  grades?: GradeLikeItem[] | null;
}): number | null {
  // 1. If pre-computed per-course summaries exist with recorded work, use their percentages
  if (input.summaries && input.summaries.length > 0) {
    const active = input.summaries.filter((s) => s.gradeCount > 0);
    if (active.length > 0) {
      const courseGps = active
        .map((s) => percentToGradePoint(s.percentage))
        .filter((gp): gp is number => gp !== null);
      if (courseGps.length > 0) {
        return computeGwa(courseGps);
      }
    }
  }

  // 2. Otherwise, group raw graded items by course
  if (input.grades && input.grades.length > 0) {
    const courseMap = new Map<string, { earned: number; possible: number; count: number }>();

    for (const g of input.grades) {
      const key = g.courseId || g.courseCode || g.courseName || 'default';
      const existing = courseMap.get(key) || { earned: 0, possible: 0, count: 0 };
      const score = Number(g.value) || 0;
      const max = Number(g.maxValue) || 0;

      if (max > 0) {
        existing.earned += score;
        existing.possible += max;
      } else {
        existing.earned += score;
        existing.possible += 100;
      }
      existing.count += 1;
      courseMap.set(key, existing);
    }

    const courseGradePoints: number[] = [];
    for (const [, courseData] of courseMap) {
      if (courseData.count > 0 && courseData.possible > 0) {
        const coursePct = Math.round((courseData.earned / courseData.possible) * 100 * 10) / 10;
        const gp = percentToGradePoint(coursePct);
        if (gp !== null) {
          courseGradePoints.push(gp);
        }
      }
    }

    if (courseGradePoints.length > 0) {
      return computeGwa(courseGradePoints);
    }
  }

  return null;
}

