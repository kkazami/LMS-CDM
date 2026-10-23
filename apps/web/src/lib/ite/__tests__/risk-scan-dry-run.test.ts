import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeRiskScan, type DryRunScanResult, type NormalScanResult } from "../risk-scan-service";
import type { RiskResult } from "../risk-service";
import type { RiskLevel } from "@prisma/client";

describe("ITE Risk Scan: dry-run vs live execution", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  const mockCourse = {
    id: "course-ite-101",
    title: "Teaching Foundations",
    instructorId: "instructor-prof-1",
  };

  const mockEnrollments = [
    {
      studentId: "student-1",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      student: { id: "student-1", name: "Maria Clara" },
    },
    {
      studentId: "student-2",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      student: { id: "student-2", name: "Crisostomo Ibarra" },
    },
  ];

  it("in dryRun mode: performs zero database writes and returns comprehensive dry-run breakdown", async () => {
    const notificationCalls: Array<{ userId: string; title: string; message: string }> = [];
    const updateAlertCalls: Array<{ studentId: string; courseId: string; data: unknown }> = [];
    const computeRiskCalls: Array<{ studentId: string; options?: { dryRun?: boolean } }> = [];

    const mockRiskResults: Record<string, RiskResult> = {
      "student-1": {
        studentId: "student-1",
        courseId: mockCourse.id,
        level: "HIGH",
        riskScore: 82,
        engagementScore: 18,
        reasons: [{ code: "LOW_ENGAGEMENT", label: "Low engagement", detail: "Active 1 of last 14 days" }],
        skipped: false,
      },
      "student-2": {
        studentId: "student-2",
        courseId: mockCourse.id,
        level: "LOW",
        riskScore: 10,
        engagementScore: 92,
        reasons: [],
        skipped: false,
      },
    };

    const result = (await executeRiskScan(
      { dryRun: true, now },
      {
        findIteInstitute: async () => ({ id: "inst-ite" }),
        findCourses: async () => [mockCourse],
        findEnrollments: async () => mockEnrollments,
        findExistingAssessments: async () => [
          { studentId: "student-1", level: "LOW", lastAlertedAt: null, lastAlertedLevel: null },
          { studentId: "student-2", level: "LOW", lastAlertedAt: null, lastAlertedLevel: null },
        ],
        computeRisk: async (studentId, courseId, options) => {
          computeRiskCalls.push({ studentId, options });
          return mockRiskResults[studentId];
        },
        createNotification: async (params) => {
          notificationCalls.push(params);
        },
        updateAssessmentAlert: async (studentId, courseId, data) => {
          updateAlertCalls.push({ studentId, courseId, data });
        },
      }
    )) as DryRunScanResult;

    // 1. Zero writes assertion
    assert.equal(notificationCalls.length, 0, "No notifications should be sent in dry-run mode");
    assert.equal(updateAlertCalls.length, 0, "No assessment alert timestamps should be updated in dry-run mode");
    assert.equal(computeRiskCalls.every((c) => c.options?.dryRun === true), true, "computeRisk must receive dryRun: true");

    // 2. Response shape and counts
    assert.equal(result.dryRun, true);
    assert.equal(result.scanned, 2);
    assert.equal(result.wouldUpdate, 2);
    assert.equal(result.wouldAlertStudents, 1);
    assert.equal(result.wouldSendInstructorDigests, 1);
    assert.deepEqual(result.byLevel, { LOW: 1, MEDIUM: 0, HIGH: 1 });

    // 3. Course breakdown
    assert.equal(result.courses.length, 1);
    assert.deepEqual(result.courses[0], {
      courseId: "course-ite-101",
      courseTitle: "Teaching Foundations",
      scanned: 2,
      high: 1,
      medium: 0,
      low: 1,
    });

    // 4. Sample safety: must NOT contain student names, emails, or IDs
    assert.equal(result.sample.length, 1);
    assert.deepEqual(result.sample[0], {
      courseTitle: "Teaching Foundations",
      level: "HIGH",
      reasonCodes: ["LOW_ENGAGEMENT"],
    });

    const sampleString = JSON.stringify(result.sample);
    assert.equal(sampleString.includes("student-1"), false);
    assert.equal(sampleString.includes("Maria Clara"), false);
    assert.equal(sampleString.includes("Crisostomo"), false);
  });

  it("in live mode (dryRun: false): executes notifications and alert updates as expected", async () => {
    const notificationCalls: Array<{ userId: string; type: string; title: string; message: string }> = [];
    const updateAlertCalls: Array<{ studentId: string; courseId: string; data: { lastAlertedAt: Date; lastAlertedLevel: RiskLevel } }> = [];
    const computeRiskCalls: Array<{ studentId: string; options?: { dryRun?: boolean } }> = [];

    const mockRiskResults: Record<string, RiskResult> = {
      "student-1": {
        studentId: "student-1",
        courseId: mockCourse.id,
        level: "HIGH",
        riskScore: 82,
        engagementScore: 18,
        reasons: [{ code: "LOW_ENGAGEMENT", label: "Low engagement", detail: "Active 1 of last 14 days" }],
        skipped: false,
      },
      "student-2": {
        studentId: "student-2",
        courseId: mockCourse.id,
        level: "LOW",
        riskScore: 10,
        engagementScore: 92,
        reasons: [],
        skipped: false,
      },
    };

    const result = (await executeRiskScan(
      { dryRun: false, now },
      {
        findIteInstitute: async () => ({ id: "inst-ite" }),
        findCourses: async () => [mockCourse],
        findEnrollments: async () => mockEnrollments,
        findExistingAssessments: async () => [
          { studentId: "student-1", level: "LOW", lastAlertedAt: null, lastAlertedLevel: null },
          { studentId: "student-2", level: "LOW", lastAlertedAt: null, lastAlertedLevel: null },
        ],
        computeRisk: async (studentId, courseId, options) => {
          computeRiskCalls.push({ studentId, options });
          return mockRiskResults[studentId];
        },
        createNotification: async (params) => {
          notificationCalls.push(params);
        },
        updateAssessmentAlert: async (studentId, courseId, data) => {
          updateAlertCalls.push({ studentId, courseId, data });
        },
      }
    )) as NormalScanResult;

    // Normal mode response
    assert.equal(result.scanned, 2);
    assert.equal(result.updated, 2);
    assert.equal(result.alertsSent, 1);
    assert.equal("dryRun" in result, false);

    // Writes executed
    // 1 student alert + 1 instructor digest
    assert.equal(notificationCalls.length, 2);
    assert.equal(notificationCalls[0].userId, "student-1");
    assert.equal(notificationCalls[0].type, "ALERT");
    assert.equal(notificationCalls[1].userId, "instructor-prof-1");

    // 1 assessment alert update
    assert.equal(updateAlertCalls.length, 1);
    assert.equal(updateAlertCalls[0].studentId, "student-1");
    assert.equal(updateAlertCalls[0].data.lastAlertedLevel, "HIGH");

    // computeRisk called with dryRun: false
    assert.equal(computeRiskCalls.every((c) => c.options?.dryRun === false), true);
  });
});
