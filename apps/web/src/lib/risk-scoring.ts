/**
 * Configurable thresholds for At-Risk Student Risk Scoring.
 * Defined as explicit top-level constants for easy adjustment.
 */
export const MISSED_ASSIGNMENTS_HIGH_THRESHOLD = 3;
export const MISSED_ASSIGNMENTS_MEDIUM_THRESHOLD = 1;

export const QUIZ_AVERAGE_LOW_THRESHOLD = 65; // Below 65% average triggers High Risk
export const QUIZ_AVERAGE_MEDIUM_THRESHOLD = 75; // 65%–74% average triggers Medium Risk

export const INACTIVITY_DAYS_HIGH_THRESHOLD = 5; // 5+ days inactive triggers High Risk
export const INACTIVITY_DAYS_MEDIUM_THRESHOLD = 3; // 3–4 days inactive triggers Medium Risk

export const INCOMPLETE_MODULES_HIGH_THRESHOLD = 4;
export const INCOMPLETE_MODULES_MEDIUM_THRESHOLD = 2;

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface StudentActivityData {
  studentId: string;
  studentName: string;
  email: string;
  avatarUrl?: string | null;
  /** Array of past-due assignments/quizzes created by instructor that student never submitted */
  missedAssignments: { id: string; title: string; dueDate: string | null }[];
  /** Graded submissions */
  gradedSubmissions: { id: string; title: string; score: number; maxPoints: number }[];
  /** Calculated average percentage (0–100), or null if no graded work yet */
  gradeAverage: number | null;
  /** Date of last submission or activity, or null if never */
  lastActiveDate: string | Date | null;
  /** Days since last activity, or null if no activity recorded */
  daysInactive: number | null;
  /** Array of incomplete learning materials / syllabus items */
  incompleteModules: { id: string; title: string; type: string }[];
}

export interface RiskAnalysisResult {
  studentId: string;
  studentName: string;
  email: string;
  avatarUrl?: string | null;
  riskLevel: RiskLevel;
  riskScore: number; // Used for sorting (higher score = higher priority)
  reasons: string[];
  details: {
    missedAssignments: { id: string; title: string; dueDate: string | null }[];
    gradedSubmissions: { id: string; title: string; score: number; maxPoints: number }[];
    gradeAverage: number | null;
    daysInactive: number | null;
    incompleteModules: { id: string; title: string; type: string }[];
  };
}

/**
 * Pure rule-based scoring function that evaluates a student's real activity metrics
 * against configurable thresholds and returns a structured risk analysis.
 *
 * @param studentData - Student's performance and engagement metrics
 * @returns Structured risk assessment including riskLevel, numeric score, and human-readable reasons
 */
export function calculateRiskLevel(studentData: StudentActivityData): RiskAnalysisResult {
  const reasons: string[] = [];
  let points = 0;
  let isHighRiskTriggered = false;
  let isMediumRiskTriggered = false;

  // 1. Missed Assignments
  const missedCount = studentData.missedAssignments.length;
  if (missedCount >= MISSED_ASSIGNMENTS_HIGH_THRESHOLD) {
    reasons.push(`${missedCount} missed assignments past due date`);
    points += 35;
    isHighRiskTriggered = true;
  } else if (missedCount >= MISSED_ASSIGNMENTS_MEDIUM_THRESHOLD) {
    reasons.push(`${missedCount} missed assignment${missedCount > 1 ? "s" : ""}`);
    points += 15;
    isMediumRiskTriggered = true;
  }

  // 2. Low Grade / Quiz Average
  if (studentData.gradeAverage !== null) {
    if (studentData.gradeAverage < QUIZ_AVERAGE_LOW_THRESHOLD) {
      reasons.push(`Low academic average (${Math.round(studentData.gradeAverage)}%)`);
      points += 35;
      isHighRiskTriggered = true;
    } else if (studentData.gradeAverage < QUIZ_AVERAGE_MEDIUM_THRESHOLD) {
      reasons.push(`Below-average performance (${Math.round(studentData.gradeAverage)}%)`);
      points += 15;
      isMediumRiskTriggered = true;
    }
  }

  // 3. Inactivity
  if (studentData.daysInactive !== null) {
    if (studentData.daysInactive >= INACTIVITY_DAYS_HIGH_THRESHOLD) {
      reasons.push(`No activity for ${studentData.daysInactive} days`);
      points += 30;
      isHighRiskTriggered = true;
    } else if (studentData.daysInactive >= INACTIVITY_DAYS_MEDIUM_THRESHOLD) {
      reasons.push(`Inactive for ${studentData.daysInactive} days`);
      points += 10;
      isMediumRiskTriggered = true;
    }
  }

  // 4. Incomplete Learning Modules
  const incompleteCount = studentData.incompleteModules.length;
  if (incompleteCount >= INCOMPLETE_MODULES_HIGH_THRESHOLD) {
    reasons.push(`${incompleteCount} incomplete learning modules`);
    points += 20;
    isHighRiskTriggered = true;
  } else if (incompleteCount >= INCOMPLETE_MODULES_MEDIUM_THRESHOLD) {
    reasons.push(`${incompleteCount} incomplete module${incompleteCount > 1 ? "s" : ""}`);
    points += 10;
    isMediumRiskTriggered = true;
  }

  // Determine overall risk level
  let riskLevel: RiskLevel = "LOW";
  if (isHighRiskTriggered || points >= 35) {
    riskLevel = "HIGH";
  } else if (isMediumRiskTriggered || points >= 15) {
    riskLevel = "MEDIUM";
  }

  return {
    studentId: studentData.studentId,
    studentName: studentData.studentName,
    email: studentData.email,
    avatarUrl: studentData.avatarUrl,
    riskLevel,
    riskScore: points,
    reasons: reasons.length > 0 ? reasons : ["Good standing — performing well"],
    details: {
      missedAssignments: studentData.missedAssignments,
      gradedSubmissions: studentData.gradedSubmissions,
      gradeAverage: studentData.gradeAverage,
      daysInactive: studentData.daysInactive,
      incompleteModules: studentData.incompleteModules,
    },
  };
}
