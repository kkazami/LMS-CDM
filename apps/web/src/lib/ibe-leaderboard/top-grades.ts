import {
  calculatePeriodGrades,
  defaultPeriodPolicy,
  periodPolicySchema,
  resolveItemPeriod,
  type CategoryAllocation,
  type GradingPeriod,
  type ItemPeriod,
  type PeriodPolicy,
} from "../grading/periods";
import {
  formatGradePoint,
  isPassing,
  percentToGradePoint,
} from "../grading/ph-scale";

export interface TopGradeStudentEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  period: GradingPeriod;
  percentage: number;
  gradePoint: string;
  isPassingGrade: boolean;
  gradedCount: number;
  totalCount: number;
  isComplete: boolean;
}

export interface CourseTopGradesGroup {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  midtermTop10: TopGradeStudentEntry[];
  finalsTop10: TopGradeStudentEntry[];
}

export interface IbeInstructorTopGradesData {
  overallMidtermTop10: TopGradeStudentEntry[];
  overallFinalsTop10: TopGradeStudentEntry[];
  byCourse: CourseTopGradesGroup[];
}

export interface RawCourseGradeInput {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  students: Array<{
    id: string;
    name: string;
    studentNumber: string | null;
  }>;
  items: Array<{
    id: string;
    type: string;
    maxPoints: number | null;
    gradingPeriod: ItemPeriod;
  }>;
  scoresByStudent: Record<string, Record<string, number | null | undefined>>;
  periodPolicy: PeriodPolicy;
  legacyWeights: CategoryAllocation[];
}

/**
 * Computes a student's percentage for a given grading period (MIDTERM or FINALS).
 * Uses the official `calculatePeriodGrades` result when all period items are graded;
 * falls back to the student's current running standing across graded items in that
 * period when grading is in progress so instructors can still see current Top 10 leaders.
 */
export function evaluateStudentPeriodStanding(params: {
  items: RawCourseGradeInput["items"];
  studentScores: Record<string, number | null | undefined>;
  period: GradingPeriod;
  periodPolicy: PeriodPolicy;
  legacyWeights: CategoryAllocation[];
}): {
  percentage: number | null;
  gradedCount: number;
  totalCount: number;
  isComplete: boolean;
} {
  const { items, studentScores, period, periodPolicy, legacyWeights } = params;
  const relevant = items.filter(
    (item) =>
      item.gradingPeriod === period &&
      item.maxPoints !== null &&
      item.maxPoints > 0
  );

  if (relevant.length === 0) {
    return {
      percentage: null,
      gradedCount: 0,
      totalCount: 0,
      isComplete: false,
    };
  }

  const official = calculatePeriodGrades(
    items,
    (itemId) => studentScores[itemId],
    periodPolicy,
    legacyWeights
  )[period];

  if (official.percentage !== null) {
    return {
      percentage: Number(official.percentage.toFixed(2)),
      gradedCount: official.graded,
      totalCount: official.total,
      isComplete: true,
    };
  }

  // Running standing across already-graded items in this period
  const gradedItems = relevant.filter((item) => {
    const val = studentScores[item.id];
    return (
      typeof val === "number" &&
      Number.isFinite(val) &&
      val >= 0 &&
      item.maxPoints !== null &&
      val <= item.maxPoints
    );
  });

  if (gradedItems.length === 0) {
    return {
      percentage: null,
      gradedCount: 0,
      totalCount: relevant.length,
      isComplete: false,
    };
  }

  const weights = periodPolicy.categoryWeights[period] ?? legacyWeights;
  let runningPct: number | null = null;

  if (weights.length > 0) {
    let earnedWeighted = 0;
    let applicableWeight = 0;
    for (const w of weights) {
      if (w.weightPercentage <= 0) continue;
      const catGraded = gradedItems.filter((item) => item.type === w.category);
      if (catGraded.length === 0) continue;
      const catEarned = catGraded.reduce(
        (sum, item) => sum + (studentScores[item.id] as number),
        0
      );
      const catMax = catGraded.reduce(
        (sum, item) => sum + (item.maxPoints as number),
        0
      );
      if (catMax > 0) {
        earnedWeighted += (catEarned / catMax) * w.weightPercentage;
        applicableWeight += w.weightPercentage;
      }
    }
    if (applicableWeight > 0) {
      runningPct = (earnedWeighted / applicableWeight) * 100;
    }
  }

  if (runningPct === null) {
    const totalEarned = gradedItems.reduce(
      (sum, item) => sum + (studentScores[item.id] as number),
      0
    );
    const totalMax = gradedItems.reduce(
      (sum, item) => sum + (item.maxPoints as number),
      0
    );
    if (totalMax > 0) {
      runningPct = (totalEarned / totalMax) * 100;
    }
  }

  if (runningPct === null) {
    return {
      percentage: null,
      gradedCount: gradedItems.length,
      totalCount: relevant.length,
      isComplete: false,
    };
  }

  return {
    percentage: Number(runningPct.toFixed(2)),
    gradedCount: gradedItems.length,
    totalCount: relevant.length,
    isComplete: gradedItems.length === relevant.length,
  };
}

export function rankTop10Entries(
  entries: Omit<TopGradeStudentEntry, "rank">[]
): TopGradeStudentEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    if (a.isComplete !== b.isComplete) {
      return a.isComplete ? -1 : 1;
    }
    if (b.gradedCount !== a.gradedCount) {
      return b.gradedCount - a.gradedCount;
    }
    const nameCmp = a.studentName.localeCompare(b.studentName);
    if (nameCmp !== 0) return nameCmp;
    return a.courseCode.localeCompare(b.courseCode);
  });

  return sorted.slice(0, 10).map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export function computeIbeInstructorTopGrades(
  courses: RawCourseGradeInput[]
): IbeInstructorTopGradesData {
  const allMidtermCandidates: Omit<TopGradeStudentEntry, "rank">[] = [];
  const allFinalsCandidates: Omit<TopGradeStudentEntry, "rank">[] = [];
  const byCourse: CourseTopGradesGroup[] = [];

  for (const course of courses) {
    const courseMidterm: Omit<TopGradeStudentEntry, "rank">[] = [];
    const courseFinals: Omit<TopGradeStudentEntry, "rank">[] = [];

    for (const student of course.students) {
      const studentScores = course.scoresByStudent[student.id] ?? {};

      for (const period of ["MIDTERM", "FINALS"] as const) {
        const standing = evaluateStudentPeriodStanding({
          items: course.items,
          studentScores,
          period,
          periodPolicy: course.periodPolicy,
          legacyWeights: course.legacyWeights,
        });

        if (standing.percentage === null) continue;

        const gpNumeric = percentToGradePoint(standing.percentage);
        const candidate: Omit<TopGradeStudentEntry, "rank"> = {
          studentId: student.id,
          studentName: student.name,
          studentNumber: student.studentNumber,
          courseId: course.courseId,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          section: course.section,
          period,
          percentage: standing.percentage,
          gradePoint: formatGradePoint(gpNumeric),
          isPassingGrade: isPassing(gpNumeric),
          gradedCount: standing.gradedCount,
          totalCount: standing.totalCount,
          isComplete: standing.isComplete,
        };

        if (period === "MIDTERM") {
          courseMidterm.push(candidate);
          allMidtermCandidates.push(candidate);
        } else {
          courseFinals.push(candidate);
          allFinalsCandidates.push(candidate);
        }
      }
    }

    byCourse.push({
      courseId: course.courseId,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      section: course.section,
      midtermTop10: rankTop10Entries(courseMidterm),
      finalsTop10: rankTop10Entries(courseFinals),
    });
  }

  return {
    overallMidtermTop10: rankTop10Entries(allMidtermCandidates),
    overallFinalsTop10: rankTop10Entries(allFinalsCandidates),
    byCourse,
  };
}

/**
 * Loads and computes Top 10 Midterm & Finals student grades across an IBE instructor's courses
 * using a single batched query set (no N+1 queries).
 */
export async function loadIbeInstructorTopGrades(
  taughtCourses: Array<{
    id: string;
    code: string;
    title: string;
    section: string;
  }>
): Promise<IbeInstructorTopGradesData> {
  if (taughtCourses.length === 0) {
    return {
      overallMidtermTop10: [],
      overallFinalsTop10: [],
      byCourse: [],
    };
  }

  const { db } = await import("../db");
  const courseIds = taughtCourses.map((c) => c.id);

  const [
    enrollments,
    syllabusItems,
    gradingPolicies,
    periodPolicies,
    periodAssignments,
  ] = await Promise.all([
    db.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        status: "APPROVED",
      },
      select: {
        courseId: true,
        student: {
          select: {
            id: true,
            name: true,
            studentNumber: true,
          },
        },
      },
      orderBy: [{ student: { name: "asc" } }],
    }),
    db.syllabusItem.findMany({
      where: {
        courseId: { in: courseIds },
        type: { not: "MATERIAL" },
        maxPoints: { gt: 0 },
      },
      select: {
        id: true,
        courseId: true,
        type: true,
        maxPoints: true,
      },
    }),
    db.gradingPolicy.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
        weights: {
          select: {
            category: true,
            weightPercentage: true,
          },
        },
      },
    }),
    db.courseGradebookPolicy
      .findMany({
        where: { courseId: { in: courseIds } },
        select: {
          courseId: true,
          midtermWeightPercentage: true,
          finalsWeightPercentage: true,
          categoryWeights: true,
        },
      })
      .catch(() => []),
    db.classworkGradingPeriod
      .findMany({
        where: { syllabusItem: { courseId: { in: courseIds } } },
        select: {
          syllabusItemId: true,
          period: true,
        },
      })
      .catch(() => []),
  ]);

  const itemIds = syllabusItems.map((i) => i.id);
  const gradedSubmissions =
    itemIds.length > 0
      ? await db.studentSubmission.findMany({
          where: {
            syllabusItemId: { in: itemIds },
            grade: { not: null },
          },
          select: {
            studentId: true,
            syllabusItemId: true,
            grade: true,
          },
        })
      : [];

  const explicitPeriodByItem = new Map<string, string>();
  for (const row of periodAssignments) {
    explicitPeriodByItem.set(row.syllabusItemId, row.period);
  }

  const periodPolicyByCourse = new Map<string, PeriodPolicy>();
  for (const row of periodPolicies) {
    const parsed = periodPolicySchema.safeParse({
      midtermWeightPercentage: row.midtermWeightPercentage,
      finalsWeightPercentage: row.finalsWeightPercentage,
      categoryWeights: row.categoryWeights,
    });
    if (parsed.success) {
      periodPolicyByCourse.set(row.courseId, parsed.data);
    }
  }

  const legacyWeightsByCourse = new Map<string, CategoryAllocation[]>();
  for (const row of gradingPolicies) {
    legacyWeightsByCourse.set(row.courseId, row.weights);
  }

  const studentsByCourse = new Map<
    string,
    Array<{ id: string; name: string; studentNumber: string | null }>
  >();
  for (const enrollment of enrollments) {
    const list = studentsByCourse.get(enrollment.courseId) ?? [];
    list.push({
      id: enrollment.student.id,
      name: enrollment.student.name,
      studentNumber: enrollment.student.studentNumber,
    });
    studentsByCourse.set(enrollment.courseId, list);
  }

  const itemsByCourse = new Map<string, RawCourseGradeInput["items"]>();
  const courseOfItem = new Map<string, string>();
  for (const item of syllabusItems) {
    courseOfItem.set(item.id, item.courseId);
    const list = itemsByCourse.get(item.courseId) ?? [];
    list.push({
      id: item.id,
      type: item.type,
      maxPoints: item.maxPoints,
      gradingPeriod: resolveItemPeriod(
        item.type,
        explicitPeriodByItem.get(item.id)
      ),
    });
    itemsByCourse.set(item.courseId, list);
  }

  const scoresByCourseAndStudent = new Map<
    string,
    Record<string, Record<string, number | null | undefined>>
  >();
  for (const sub of gradedSubmissions) {
    const cId = courseOfItem.get(sub.syllabusItemId);
    if (!cId) continue;
    let courseScores = scoresByCourseAndStudent.get(cId);
    if (!courseScores) {
      courseScores = {};
      scoresByCourseAndStudent.set(cId, courseScores);
    }
    let studentMap = courseScores[sub.studentId];
    if (!studentMap) {
      studentMap = {};
      courseScores[sub.studentId] = studentMap;
    }
    studentMap[sub.syllabusItemId] = sub.grade;
  }

  const rawInputs: RawCourseGradeInput[] = taughtCourses.map((course) => ({
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    section: course.section,
    students: studentsByCourse.get(course.id) ?? [],
    items: itemsByCourse.get(course.id) ?? [],
    scoresByStudent: scoresByCourseAndStudent.get(course.id) ?? {},
    periodPolicy: periodPolicyByCourse.get(course.id) ?? defaultPeriodPolicy,
    legacyWeights: legacyWeightsByCourse.get(course.id) ?? [],
  }));

  return computeIbeInstructorTopGrades(rawInputs);
}
