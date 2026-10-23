/**
 * apps/web/src/lib/ite/risk-service.ts
 *
 * Computes and persists per-student, per-course risk assessments for ITE.
 *
 * computeRisk() is the main entry point:
 * - Combines engagement score, missed deadlines, inactivity, and grade.
 * - Upserts the result into RiskAssessment.
 * - Returns a structured result with reasons (code + label + detail).
 * - Skips students enrolled < MIN_ENROLMENT_AGE_DAYS or not yet APPROVED.
 *
 * computeRiskFromData() is the pure, unit-testable computation function.
 * All thresholds come from engagement-config.ts.
 */

import { db } from "@/lib/db";
import type { RiskLevel, Prisma } from "@prisma/client";
import { computeEngagement } from "./engagement-service";
import {
  MIN_ENROLMENT_AGE_DAYS,
  RISK_HIGH_ENGAGEMENT_THRESHOLD,
  RISK_MEDIUM_ENGAGEMENT_THRESHOLD,
  RISK_HIGH_OVERDUE_TASKS,
  RISK_MEDIUM_OVERDUE_TASKS,
  RISK_HIGH_INACTIVE_DAYS,
  RISK_MEDIUM_INACTIVE_DAYS,
  RISK_HIGH_GRADE_THRESHOLD,
  RISK_MEDIUM_GRADE_THRESHOLD,
  PASSING_GRADE_PERCENT,
  RISK_SCORE_WEIGHTS,
} from "./engagement-config";

// ─── Public types ──────────────────────────────────────────────────────────

export interface RiskReason {
  /** Machine-readable code for rule-based UI suggestions */
  code:
    | "LOW_ENGAGEMENT"
    | "OVERDUE_TASKS"
    | "INACTIVE"
    | "LOW_GRADE"
    | "NEW_STUDENT";
  label: string;
  detail: string;
}

export interface RiskResult {
  studentId: string;
  courseId: string;
  level: RiskLevel;
  riskScore: number;       // 0–100
  engagementScore: number; // 0–100
  reasons: RiskReason[];
  skipped: boolean;
  skipReason?: string;
}

export interface ComputeRiskDataParams {
  studentId: string;
  courseId: string;
  enrollmentStatus?: string;
  enrolledAt: Date;
  now?: Date;
  engagementScore: number;
  lastActivityAt: Date | null;
  overdueCount: number;
  gradeAvg: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveLevel(score: number, hasHighTrigger: boolean, hasMediumTrigger: boolean): RiskLevel {
  if (hasHighTrigger || score >= 65) return "HIGH";
  if (hasMediumTrigger || score >= 35) return "MEDIUM";
  return "LOW";
}

// ─── Pure computation (unit testable) ──────────────────────────────────────

export function computeRiskFromData(params: ComputeRiskDataParams): RiskResult {
  const {
    studentId,
    courseId,
    enrollmentStatus = "APPROVED",
    enrolledAt,
    engagementScore,
    lastActivityAt,
    overdueCount,
    gradeAvg,
  } = params;

  const now = params.now ?? new Date();

  // 1. Enrollment status guard
  if (enrollmentStatus !== "APPROVED") {
    return {
      studentId,
      courseId,
      level: "LOW",
      riskScore: 0,
      engagementScore: 0,
      reasons: [],
      skipped: true,
      skipReason: "Not enrolled or not approved",
    };
  }

  // 2. Minimum enrollment age check
  const enrolmentAgeDays = daysBetween(enrolledAt, now);
  if (enrolmentAgeDays < MIN_ENROLMENT_AGE_DAYS) {
    return {
      studentId,
      courseId,
      level: "LOW",
      riskScore: 0,
      engagementScore: 0,
      reasons: [
        {
          code: "NEW_STUDENT",
          label: "New student",
          detail: `Enrolled ${enrolmentAgeDays} day(s) ago — not enough data yet.`,
        },
      ],
      skipped: true,
      skipReason: `Enrolled only ${enrolmentAgeDays} day(s) ago`,
    };
  }

  // 3. Build reasons + factor scores
  const reasons: RiskReason[] = [];
  let hasHighTrigger = false;
  let hasMediumTrigger = false;

  // Factor 1: engagement
  const engagementFactor =
    engagementScore < RISK_HIGH_ENGAGEMENT_THRESHOLD
      ? 100
      : engagementScore < RISK_MEDIUM_ENGAGEMENT_THRESHOLD
      ? 55
      : 0;

  if (engagementScore < RISK_HIGH_ENGAGEMENT_THRESHOLD) {
    hasHighTrigger = true;
    reasons.push({
      code: "LOW_ENGAGEMENT",
      label: "Low engagement",
      detail: `Engagement score is ${engagementScore}/100 — well below the expected level for this course.`,
    });
  } else if (engagementScore < RISK_MEDIUM_ENGAGEMENT_THRESHOLD) {
    hasMediumTrigger = true;
    reasons.push({
      code: "LOW_ENGAGEMENT",
      label: "Declining engagement",
      detail: `Engagement score is ${engagementScore}/100 — below the healthy range for this course.`,
    });
  }

  // Factor 2: overdue tasks
  const overdueFactor =
    overdueCount >= RISK_HIGH_OVERDUE_TASKS
      ? 100
      : overdueCount >= RISK_MEDIUM_OVERDUE_TASKS
      ? 55
      : 0;

  if (overdueCount >= RISK_HIGH_OVERDUE_TASKS) {
    hasHighTrigger = true;
    reasons.push({
      code: "OVERDUE_TASKS",
      label: "Multiple overdue tasks",
      detail: `${overdueCount} tasks overdue and not yet submitted.`,
    });
  } else if (overdueCount >= RISK_MEDIUM_OVERDUE_TASKS) {
    hasMediumTrigger = true;
    reasons.push({
      code: "OVERDUE_TASKS",
      label: "Overdue task",
      detail: `${overdueCount} overdue task not yet submitted.`,
    });
  }

  // Factor 3: inactivity
  const daysInactive = lastActivityAt
    ? daysBetween(lastActivityAt, now)
    : Infinity;

  const inactivityFactor =
    daysInactive >= RISK_HIGH_INACTIVE_DAYS
      ? 100
      : daysInactive >= RISK_MEDIUM_INACTIVE_DAYS
      ? 55
      : 0;

  if (daysInactive !== Infinity && daysInactive >= RISK_HIGH_INACTIVE_DAYS) {
    hasHighTrigger = true;
    reasons.push({
      code: "INACTIVE",
      label: "Extended inactivity",
      detail: `No activity recorded for ${daysInactive} days.`,
    });
  } else if (daysInactive !== Infinity && daysInactive >= RISK_MEDIUM_INACTIVE_DAYS) {
    hasMediumTrigger = true;
    reasons.push({
      code: "INACTIVE",
      label: "Reduced activity",
      detail: `No activity recorded for ${daysInactive} days.`,
    });
  } else if (daysInactive === Infinity) {
    hasHighTrigger = true;
    reasons.push({
      code: "INACTIVE",
      label: "No activity recorded",
      detail: "No activity has been recorded for this student in this course.",
    });
  }

  // Factor 4: grade (exclude from weighting when insufficient data)
  let gradeFactor: number | null = null;
  if (gradeAvg !== null) {
    if (gradeAvg < RISK_HIGH_GRADE_THRESHOLD) {
      gradeFactor = 100;
      hasHighTrigger = true;
      reasons.push({
        code: "LOW_GRADE",
        label: "Low grade",
        detail: `Current grade average is ${Math.round(gradeAvg)}%, below the ${PASSING_GRADE_PERCENT}% passing threshold.`,
      });
    } else if (gradeAvg < RISK_MEDIUM_GRADE_THRESHOLD) {
      gradeFactor = 55;
      hasMediumTrigger = true;
      reasons.push({
        code: "LOW_GRADE",
        label: "Grade approaching threshold",
        detail: `Current grade average is ${Math.round(gradeAvg)}%, approaching the ${PASSING_GRADE_PERCENT}% passing threshold.`,
      });
    } else {
      gradeFactor = 0;
    }
  }

  // 4. Composite risk score — exclude null factors from weighting
  let totalWeight = 0;
  let weightedSum = 0;

  const addFactor = (factor: number | null, weight: number) => {
    if (factor !== null) {
      weightedSum += factor * weight;
      totalWeight += weight;
    }
  };

  addFactor(engagementFactor, RISK_SCORE_WEIGHTS.engagement);
  addFactor(overdueFactor, RISK_SCORE_WEIGHTS.overdueTasks);
  addFactor(inactivityFactor, RISK_SCORE_WEIGHTS.inactivity);
  addFactor(gradeFactor, RISK_SCORE_WEIGHTS.grade);

  const riskScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const level = resolveLevel(riskScore, hasHighTrigger, hasMediumTrigger);

  return {
    studentId,
    courseId,
    level,
    riskScore,
    engagementScore,
    reasons,
    skipped: false,
  };
}

// ─── Database-connected entry point ────────────────────────────────────────

/**
 * Computes the risk assessment for one (student, course) pair.
 * Upserts the result into the RiskAssessment table.
 *
 * @returns RiskResult — callers read this for alert decisions.
 */
export async function computeRisk(
  studentId: string,
  courseId: string,
  options?: { dryRun?: boolean }
): Promise<RiskResult> {
  const now = new Date();

  // Verify enrollment
  const enrollment = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { status: true, createdAt: true },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    return computeRiskFromData({
      studentId,
      courseId,
      enrollmentStatus: enrollment?.status ?? "NONE",
      enrolledAt: enrollment?.createdAt ?? now,
      now,
      engagementScore: 0,
      lastActivityAt: null,
      overdueCount: 0,
      gradeAvg: null,
    });
  }

  const enrolmentAgeDays = daysBetween(enrollment.createdAt, now);
  if (enrolmentAgeDays < MIN_ENROLMENT_AGE_DAYS) {
    return computeRiskFromData({
      studentId,
      courseId,
      enrollmentStatus: "APPROVED",
      enrolledAt: enrollment.createdAt,
      now,
      engagementScore: 0,
      lastActivityAt: null,
      overdueCount: 0,
      gradeAvg: null,
    });
  }

  // Compute engagement
  const engagement = await computeEngagement(studentId, courseId);

  // Compute overdue count
  const overdueItems = await db.syllabusItem.findMany({
    where: {
      courseId,
      type: { not: "MATERIAL" },
      dueDate: { lt: now },
    },
    select: { id: true },
  });

  const submittedSubs = await db.studentSubmission.findMany({
    where: {
      studentId,
      syllabusItemId: { in: overdueItems.map((i) => i.id) },
      status: { not: "DRAFT" },
      submittedAt: { not: null },
    },
    select: { syllabusItemId: true },
  });
  const submittedSet = new Set(submittedSubs.map((s) => s.syllabusItemId));
  const overdueCount = overdueItems.filter((i) => !submittedSet.has(i.id)).length;

  // Compute grade average
  const gradedSubs = await db.studentSubmission.findMany({
    where: {
      studentId,
      grade: { not: null },
      syllabusItem: { courseId, maxPoints: { gt: 0 } },
    },
    select: {
      grade: true,
      syllabusItem: { select: { maxPoints: true } },
    },
  });

  const gradeAvg =
    gradedSubs.length > 0
      ? gradedSubs.reduce(
          (sum, s) => sum + ((s.grade ?? 0) / (s.syllabusItem.maxPoints ?? 1)) * 100,
          0
        ) / gradedSubs.length
      : null;

  const result = computeRiskFromData({
    studentId,
    courseId,
    enrollmentStatus: "APPROVED",
    enrolledAt: enrollment.createdAt,
    now,
    engagementScore: engagement.score,
    lastActivityAt: engagement.lastActivityAt,
    overdueCount,
    gradeAvg,
  });

  // Upsert into DB unless dryRun is active (dry-run performs no database writes)
  if (!options?.dryRun) {
    const jsonReasons = result.reasons as unknown as Prisma.InputJsonValue;

    await db.riskAssessment.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      create: {
        studentId,
        courseId,
        level: result.level,
        riskScore: result.riskScore,
        engagementScore: result.engagementScore,
        reasons: jsonReasons,
        computedAt: now,
      },
      update: {
        level: result.level,
        riskScore: result.riskScore,
        engagementScore: result.engagementScore,
        reasons: jsonReasons,
        computedAt: now,
      },
    });
  }

  return result;
}
