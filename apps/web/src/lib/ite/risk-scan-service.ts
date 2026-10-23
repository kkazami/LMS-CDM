import { db } from "@/lib/db";
import { ITE_INSTITUTE_CODE, ALERT_REPEAT_HIGH_DAYS } from "./engagement-config";
import { computeRisk, type RiskResult } from "./risk-service";
import { createNotification } from "@/lib/notifications";
import type { RiskLevel } from "@prisma/client";

export interface DryRunScanResult {
  dryRun: true;
  scanned: number;
  wouldUpdate: number;
  wouldAlertStudents: number;
  wouldSendInstructorDigests: number;
  byLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  courses: Array<{
    courseId: string;
    courseTitle: string;
    scanned: number;
    high: number;
    medium: number;
    low: number;
  }>;
  sample: Array<{
    courseTitle: string;
    level: RiskLevel;
    reasonCodes: string[];
  }>;
}

export interface NormalScanResult {
  scanned: number;
  updated: number;
  alertsSent: number;
}

export type RiskScanExecutionResult = DryRunScanResult | NormalScanResult;

export interface RiskScanOptions {
  // Dry-run mode performs no database writes (no notifications, no risk assessment upserts or updates).
  dryRun?: boolean;
  now?: Date;
  batchSize?: number;
}

export interface RiskScanDependencies {
  findIteInstitute?: () => Promise<{ id: string } | null>;
  findCourses?: (instituteId: string) => Promise<Array<{ id: string; title: string; instructorId: string | null }>>;
  findEnrollments?: (courseId: string) => Promise<Array<{
    studentId: string;
    createdAt: Date;
    student: { id: string; name: string };
  }>>;
  findExistingAssessments?: (courseId: string, studentIds: string[]) => Promise<Array<{
    studentId: string;
    level: RiskLevel;
    lastAlertedAt: Date | null;
    lastAlertedLevel: RiskLevel | null;
  }>>;
  computeRisk?: (studentId: string, courseId: string, options?: { dryRun?: boolean }) => Promise<RiskResult>;
  createNotification?: (params: { userId: string; type: string; title: string; message: string; link: string }) => Promise<unknown>;
  updateAssessmentAlert?: (studentId: string, courseId: string, data: { lastAlertedAt: Date; lastAlertedLevel: RiskLevel }) => Promise<unknown>;
}

/**
 * Executes the ITE academic risk scan across all active ITE courses.
 *
 * In normal mode: updates RiskAssessments and creates student + instructor notifications.
 * In dry-run mode: calculates the exact impact with ZERO database writes.
 */
export async function executeRiskScan(
  options: RiskScanOptions = {},
  deps: RiskScanDependencies = {}
): Promise<RiskScanExecutionResult> {
  // Dry-run mode performs no database writes (no notifications, no risk assessment upserts or updates).
  const dryRun = options.dryRun === true;
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? 10;

  // Resolve dependencies (production db defaults or injected mocks)
  const findIteInstitute = deps.findIteInstitute ?? (async () => {
    return db.institute.findFirst({
      where: { code: ITE_INSTITUTE_CODE },
      select: { id: true },
    });
  });

  const findCourses = deps.findCourses ?? (async (instituteId: string) => {
    return db.course.findMany({
      where: { instituteId, isArchived: false },
      select: { id: true, title: true, instructorId: true },
    });
  });

  const findEnrollments = deps.findEnrollments ?? (async (courseId: string) => {
    return db.enrollment.findMany({
      where: {
        courseId,
        status: "APPROVED",
        student: { institute: { code: ITE_INSTITUTE_CODE } },
      },
      select: {
        studentId: true,
        createdAt: true,
        student: { select: { id: true, name: true } },
      },
    });
  });

  const findExistingAssessments = deps.findExistingAssessments ?? (async (courseId: string, studentIds: string[]) => {
    return db.riskAssessment.findMany({
      where: {
        courseId,
        studentId: { in: studentIds },
      },
      select: { studentId: true, level: true, lastAlertedAt: true, lastAlertedLevel: true },
    });
  });

  const computeRiskFn = deps.computeRisk ?? computeRisk;
  const createNotificationFn = deps.createNotification ?? createNotification;
  const updateAssessmentAlertFn = deps.updateAssessmentAlert ?? (async (studentId, courseId, data) => {
    return db.riskAssessment.updateMany({
      where: { studentId, courseId },
      data,
    });
  });

  let scanned = 0;
  let updated = 0;
  let alertsSent = 0;

  const byLevel = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const coursesBreakdown: DryRunScanResult["courses"] = [];
  const sampleAlerts: DryRunScanResult["sample"] = [];

  const iteInstitute = await findIteInstitute();
  if (!iteInstitute) {
    if (dryRun) {
      return {
        dryRun: true,
        scanned: 0,
        wouldUpdate: 0,
        wouldAlertStudents: 0,
        wouldSendInstructorDigests: 0,
        byLevel,
        courses: [],
        sample: [],
      };
    }
    return { scanned: 0, updated: 0, alertsSent: 0 };
  }

  const courses = await findCourses(iteInstitute.id);

  const instructorDigests = new Map<string, {
    instructorId: string;
    courseId: string;
    courseTitle: string;
    escalated: { studentName: string; level: RiskLevel; reasons: string[] }[];
  }>();

  for (const course of courses) {
    let courseScanned = 0;
    let courseHigh = 0;
    let courseMedium = 0;
    let courseLow = 0;

    const enrollments = await findEnrollments(course.id);
    if (enrollments.length === 0) {
      if (dryRun) {
        coursesBreakdown.push({
          courseId: course.id,
          courseTitle: course.title,
          scanned: 0,
          high: 0,
          medium: 0,
          low: 0,
        });
      }
      continue;
    }

    const existingAssessments = await findExistingAssessments(course.id, enrollments.map((e) => e.studentId));
    const existingMap = new Map<string, { level: RiskLevel; lastAlertedAt: Date | null; lastAlertedLevel: RiskLevel | null }>();
    for (const a of existingAssessments) {
      existingMap.set(a.studentId, a);
    }

    for (let i = 0; i < enrollments.length; i += batchSize) {
      const batch = enrollments.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (enrollment) => {
          scanned++;
          courseScanned++;

          const result = await computeRiskFn(enrollment.studentId, course.id, { dryRun });

          if (result.skipped) {
            byLevel.LOW++;
            courseLow++;
            return;
          }

          updated++;

          // Track level distribution
          if (result.level === "HIGH") {
            byLevel.HIGH++;
            courseHigh++;
          } else if (result.level === "MEDIUM") {
            byLevel.MEDIUM++;
            courseMedium++;
          } else {
            byLevel.LOW++;
            courseLow++;
          }

          const prev = existingMap.get(enrollment.studentId);
          const prevLevel = prev?.level ?? "LOW";
          const lastAlertedAt = prev?.lastAlertedAt;
          const lastAlertedLevel = prev?.lastAlertedLevel;

          // ── Alert decision ──────────────────────────────────────
          // Escalation: LOW -> MEDIUM/HIGH, or MEDIUM -> HIGH, or newly assessed as at-risk without prior alert
          const escalated =
            (prevLevel === "LOW" && (result.level === "MEDIUM" || result.level === "HIGH")) ||
            (prevLevel === "MEDIUM" && result.level === "HIGH") ||
            ((result.level === "HIGH" || result.level === "MEDIUM") && lastAlertedAt == null);

          // Repeat HIGH: stayed HIGH for more than 7 days since lastAlertedAt
          const repeatedHigh =
            result.level === "HIGH" &&
            lastAlertedLevel === "HIGH" &&
            lastAlertedAt != null &&
            now.getTime() - lastAlertedAt.getTime() >= ALERT_REPEAT_HIGH_DAYS * 24 * 60 * 60 * 1000;

          if (escalated || repeatedHigh) {
            alertsSent++;

            // Dry-run sample (NO student names, emails, or user IDs)
            if (dryRun && sampleAlerts.length < 5) {
              sampleAlerts.push({
                courseTitle: course.title,
                level: result.level,
                reasonCodes: result.reasons.map((r) => r.code),
              });
            }

            // Track for instructor digest
            if (course.instructorId) {
              const digestKey = `${course.instructorId}_${course.id}`;
              if (!instructorDigests.has(digestKey)) {
                instructorDigests.set(digestKey, {
                  instructorId: course.instructorId,
                  courseId: course.id,
                  courseTitle: course.title,
                  escalated: [],
                });
              }
              instructorDigests.get(digestKey)!.escalated.push({
                studentName: enrollment.student.name,
                level: result.level,
                reasons: result.reasons.map((r) => r.detail),
              });
            }

            // In normal mode ONLY: write notifications and update lastAlertedAt
            if (!dryRun) {
              const topReasons = result.reasons.slice(0, 3).map((r) => r.detail).join(" ");
              const link = `/ite/courses/${course.id}/classwork`;
              await createNotificationFn({
                userId: enrollment.studentId,
                type: "ALERT",
                title: `Participation update in ${course.title}`,
                message: `Your engagement needs attention. ${topReasons} Submitting pending tasks or reaching out to your instructor are good next steps.`,
                link,
              });

              await updateAssessmentAlertFn(enrollment.studentId, course.id, {
                lastAlertedAt: now,
                lastAlertedLevel: result.level,
              });
            }
          }
        })
      );
    }

    if (dryRun) {
      coursesBreakdown.push({
        courseId: course.id,
        courseTitle: course.title,
        scanned: courseScanned,
        high: courseHigh,
        medium: courseMedium,
        low: courseLow,
      });
    }
  }

  // Instructor digests
  const validDigests = Array.from(instructorDigests.values()).filter((d) => d.escalated.length > 0);

  if (!dryRun) {
    for (const digest of validDigests) {
      const studentList = digest.escalated
        .map((s) => `• ${s.studentName} (${s.level}): ${s.reasons[0] ?? "Engagement needs attention"}`)
        .join("\n");

      await createNotificationFn({
        userId: digest.instructorId,
        type: "ALERT",
        title: `At-Risk Students Digest — ${digest.courseTitle}`,
        message: `${digest.escalated.length} student(s) need attention:\n${studentList}`,
        link: `/ite/courses/${digest.courseId}/participation`,
      });
    }

    return { scanned, updated, alertsSent };
  }

  return {
    dryRun: true,
    scanned,
    wouldUpdate: updated,
    wouldAlertStudents: alertsSent,
    wouldSendInstructorDigests: validDigests.length,
    byLevel,
    courses: coursesBreakdown,
    sample: sampleAlerts,
  };
}
