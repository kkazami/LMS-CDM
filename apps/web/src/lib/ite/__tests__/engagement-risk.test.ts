import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeEngagementFromData } from "../engagement-service";
import { computeRiskFromData } from "../risk-service";

describe("ITE Participation Tracker: computeEngagement", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  it("handles a student with no data (0 events, 0 submissions)", () => {
    const result = computeEngagementFromData({
      events: [],
      submissions: [],
      enrolledAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      now,
    });

    assert.equal(result.score, 0);
    assert.equal(result.components.activeDays, 0);
    assert.equal(result.components.onTimeRate, "insufficient_data");
    assert.equal(result.components.learningActions, 0);
    assert.equal(result.components.recencyScore, 0);
    assert.equal(result.dailySeries.length, 14);
    assert.equal(result.dailySeries.every((d) => d.count === 0), true);
    assert.equal(result.lastActivityAt, null);
    assert.equal(result.trend, "FLAT");
  });

  it("calculates high engagement when student is active daily and all tasks on time", () => {
    // Generate events for each of the last 14 days
    const events: { createdAt: Date; type: "LOGIN" | "MATERIAL_VIEW" }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      events.push({ createdAt: d, type: "LOGIN" });
      events.push({ createdAt: d, type: "MATERIAL_VIEW" });
    }

    // 3 tasks due in window, all submitted on time
    const submissions = [
      {
        submittedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        syllabusItem: { dueDate: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000) },
      },
      {
        submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        syllabusItem: { dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
      },
      {
        submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        syllabusItem: { dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      },
    ];

    const result = computeEngagementFromData({
      events,
      submissions,
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
    });

    assert.equal(result.components.activeDays, 100);
    assert.equal(result.components.onTimeRate, 100);
    assert.equal(result.components.recencyScore, 100);
    assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
    assert.equal(result.dailySeries.length, 14);
  });

  it("penalizes recency when student has been inactive for 10+ days", () => {
    const lastActiveDate = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
    const events = [
      { createdAt: lastActiveDate, type: "LOGIN" as const },
    ];

    const result = computeEngagementFromData({
      events,
      submissions: [],
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
    });

    // Recency score should be low because last activity was 12 days ago
    assert.ok(result.components.recencyScore < 20, `Expected recency < 20, got ${result.components.recencyScore}`);
    assert.equal(result.lastActivityAt?.getTime(), lastActiveDate.getTime());
  });
});

describe("ITE Participation Tracker: computeRisk", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  it("skips brand-new students enrolled less than 7 days", () => {
    const result = computeRiskFromData({
      studentId: "student-1",
      courseId: "course-1",
      enrollmentStatus: "APPROVED",
      enrolledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      now,
      engagementScore: 0,
      lastActivityAt: null,
      overdueCount: 0,
      gradeAvg: null,
    });

    assert.equal(result.skipped, true);
    assert.ok(result.skipReason?.includes("3 day(s) ago"));
    assert.equal(result.level, "LOW");
    assert.equal(result.riskScore, 0);
    assert.equal(result.reasons.length, 1);
    assert.equal(result.reasons[0].code, "NEW_STUDENT");
  });

  it("evaluates a student with all tasks on time and high engagement as LOW risk", () => {
    const result = computeRiskFromData({
      studentId: "student-2",
      courseId: "course-1",
      enrollmentStatus: "APPROVED",
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
      engagementScore: 85,
      lastActivityAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      overdueCount: 0,
      gradeAvg: 90,
    });

    assert.equal(result.skipped, false);
    assert.equal(result.level, "LOW");
    assert.equal(result.riskScore, 0);
    assert.equal(result.reasons.length, 0);
  });

  it("evaluates a student with many overdue tasks as HIGH risk", () => {
    const result = computeRiskFromData({
      studentId: "student-3",
      courseId: "course-1",
      enrollmentStatus: "APPROVED",
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
      engagementScore: 60,
      lastActivityAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      overdueCount: 4, // >= 3 is HIGH
      gradeAvg: 80,
    });

    assert.equal(result.skipped, false);
    assert.equal(result.level, "HIGH");
    assert.ok(result.reasons.some((r) => r.code === "OVERDUE_TASKS"));
    assert.ok(result.reasons.find((r) => r.code === "OVERDUE_TASKS")?.detail.includes("4 tasks"));
  });

  it("evaluates a student inactive for 10+ days as HIGH risk", () => {
    const result = computeRiskFromData({
      studentId: "student-4",
      courseId: "course-1",
      enrollmentStatus: "APPROVED",
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
      engagementScore: 20,
      lastActivityAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000), // 11 days inactive
      overdueCount: 0,
      gradeAvg: null,
    });

    assert.equal(result.skipped, false);
    assert.equal(result.level, "HIGH");
    assert.ok(result.reasons.some((r) => r.code === "INACTIVE"));
    assert.ok(result.reasons.some((r) => r.code === "LOW_ENGAGEMENT"));
  });

  it("excludes null grade from weighting rather than treating it as 0%", () => {
    // When grade is null, risk score should only be computed from engagement, overdue, and inactivity
    const resultWithNullGrade = computeRiskFromData({
      studentId: "student-5",
      courseId: "course-1",
      enrollmentStatus: "APPROVED",
      enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
      engagementScore: 50, // medium factor (55)
      lastActivityAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      overdueCount: 0,
      gradeAvg: null,
    });

    // Should NOT have a LOW_GRADE reason
    assert.equal(resultWithNullGrade.reasons.some((r) => r.code === "LOW_GRADE"), false);
  });
});
