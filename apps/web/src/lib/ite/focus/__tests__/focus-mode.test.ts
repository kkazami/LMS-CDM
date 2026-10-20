import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampSessionProgress,
  validateCreateSessionInput,
  aggregateFocusSessions,
  autoCloseStaleSessions,
} from "../service";
import { evaluateFocusAccess } from "../guard";
import {
  splitSessionByDay,
  getManilaWeekRange,
  getManilaSevenDaySeries,
  getManilaDateString,
} from "../manila-calendar";

describe("Focus Mode Access Control Decisions", () => {
  it("allows ITE STUDENT users", () => {
    const decision = evaluateFocusAccess({
      institute: "ite",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.statusCode, 200);
  });

  it("denies ICS students with 403", () => {
    const decision = evaluateFocusAccess({
      institute: "ics",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
    assert.match(decision.reason || "", /ITE/);
  });

  it("denies IBE students with 403", () => {
    const decision = evaluateFocusAccess({
      institute: "ibe",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });

  it("denies ITE instructors/professors with 403", () => {
    const decision = evaluateFocusAccess({
      institute: "ite",
      userRole: "PROFESSOR",
      isSuperUser: false,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });

  it("denies ITE admins with 403", () => {
    const decision = evaluateFocusAccess({
      institute: "ite",
      userRole: "ADMIN",
      isSuperUser: false,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });

  it("denies super users with 403 even in ITE", () => {
    const decision = evaluateFocusAccess({
      institute: "ite",
      userRole: "STUDENT",
      isSuperUser: true,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.statusCode, 403);
  });
});

describe("Focus Session Validation & Clamping Rules", () => {
  it("validates create session input boundaries (plannedMinutes 1-240)", () => {
    const valid1 = validateCreateSessionInput({ contextType: "STUDY", plannedMinutes: 25 });
    assert.equal(valid1.contextType, "STUDY");
    assert.equal(valid1.plannedMinutes, 25);

    const valid2 = validateCreateSessionInput({ contextType: "MATERIAL", plannedMinutes: 1 });
    assert.equal(valid2.plannedMinutes, 1);

    const valid3 = validateCreateSessionInput({ contextType: "QUIZ", plannedMinutes: 240 });
    assert.equal(valid3.plannedMinutes, 240);

    const valid4 = validateCreateSessionInput({ contextType: "FLASHCARDS" });
    assert.equal(valid4.plannedMinutes, null);

    // Invalid inputs throw HttpError
    assert.throws(() => validateCreateSessionInput({ contextType: "STUDY", plannedMinutes: 0 }));
    assert.throws(() => validateCreateSessionInput({ contextType: "STUDY", plannedMinutes: 241 }));
    assert.throws(() => validateCreateSessionInput({ contextType: "INVALID" as any }));
    assert.throws(() => validateCreateSessionInput(null));
  });

  it("clamps client focusedSeconds to wall-clock elapsed time", () => {
    const now = new Date("2026-10-20T10:10:00Z");
    const startedAt = new Date("2026-10-20T10:00:00Z"); // 600 seconds elapsed

    const clamped = clampSessionProgress(
      { startedAt, focusedSeconds: 100, tabSwitchCount: 1 },
      { focusedSeconds: 9999, tabSwitchCount: 5 }, // client reports 9999s
      now
    );

    assert.equal(clamped.safeFocusedSeconds, 600); // clamped to 600 wall-clock seconds
    assert.equal(clamped.safeTabSwitchCount, 5);
  });

  it("prevents focusedSeconds from decreasing (monotonic)", () => {
    const now = new Date("2026-10-20T10:10:00Z");
    const startedAt = new Date("2026-10-20T10:00:00Z");

    const clamped = clampSessionProgress(
      { startedAt, focusedSeconds: 350, tabSwitchCount: 4 },
      { focusedSeconds: 200, tabSwitchCount: 2 }, // client reported smaller value
      now
    );

    assert.equal(clamped.safeFocusedSeconds, 350); // preserved current
    assert.equal(clamped.safeTabSwitchCount, 4); // preserved current
  });

  it("clamps tabSwitchCount to sane maximum (10,000)", () => {
    const now = new Date("2026-10-20T10:10:00Z");
    const startedAt = new Date("2026-10-20T10:00:00Z");

    const clamped = clampSessionProgress(
      { startedAt, focusedSeconds: 300, tabSwitchCount: 10 },
      { focusedSeconds: 320, tabSwitchCount: 99999 },
      now
    );

    assert.equal(clamped.safeTabSwitchCount, 10000);
  });
});

describe("Stale Session Auto-Close Rule", () => {
  it("auto-closes active sessions with heartbeat older than 5 minutes", async () => {
    const now = new Date("2026-10-20T12:00:00Z");
    let updatedCount = 0;

    const mockPrisma = {
      focusSession: {
        updateMany: async (args: any) => {
          assert.equal(args.where.userId, "user-1");
          assert.equal(args.where.status, "ACTIVE");
          // Stale threshold is now - 5 minutes
          const expectedThreshold = new Date(now.getTime() - 5 * 60 * 1000);
          assert.equal(args.where.lastHeartbeatAt.lt.getTime(), expectedThreshold.getTime());
          assert.equal(args.data.status, "ABANDONED");
          assert.equal(args.data.endedAt.getTime(), now.getTime());
          updatedCount = 1;
          return { count: 1 };
        },
      },
    };

    const res = await autoCloseStaleSessions("user-1", mockPrisma as any, now);
    assert.equal(res.count, 1);
    assert.equal(updatedCount, 1);
  });
});

describe("Weekly Summary Computation & Manila Time Rules", () => {
  it("computes empty state when student has no sessions", () => {
    const now = new Date("2026-10-20T04:00:00Z"); // 12:00 PM Manila time
    const summary = aggregateFocusSessions([], null, null, now);

    assert.equal(summary.focusedMinutesThisWeek, 0);
    assert.equal(summary.focusedMinutesLastWeek, 0);
    assert.equal(summary.completedSessionsThisWeek, 0);
    assert.equal(summary.averageTabSwitchesThisWeek, 0);
    assert.equal(summary.longestCompletedSessionMinutes, 0);
    assert.equal(summary.sevenDaySeries.length, 7);
    assert.ok(summary.sevenDaySeries.every((d) => d.focusedMinutes === 0));
  });

  it("computes stats for one completed session in current week", () => {
    const now = new Date("2026-10-20T04:00:00Z"); // Tuesday Oct 20 Manila
    const session = {
      startedAt: new Date("2026-10-20T02:00:00Z"),
      focusedSeconds: 1500, // 25 minutes
      tabSwitchCount: 3,
      status: "COMPLETED",
    };

    const summary = aggregateFocusSessions([session], { focusedSeconds: 1500 }, null, now);

    assert.equal(summary.focusedMinutesThisWeek, 25);
    assert.equal(summary.focusedMinutesLastWeek, 0);
    assert.equal(summary.completedSessionsThisWeek, 1);
    assert.equal(summary.averageTabSwitchesThisWeek, 3);
    assert.equal(summary.longestCompletedSessionMinutes, 25);

    // Check that Oct 20 entry in 7-day series has 25 minutes
    const todayKey = getManilaDateString(now);
    const todayEntry = summary.sevenDaySeries.find((d) => d.date === todayKey);
    assert.ok(todayEntry);
    assert.equal(todayEntry?.focusedMinutes, 25);
  });

  it("correctly separates sessions spanning two Manila-time weeks", () => {
    // Current week: Mon Oct 19 to Sun Oct 25, 2026
    // Last week: Mon Oct 12 to Sun Oct 18, 2026
    const now = new Date("2026-10-20T04:00:00Z"); // Oct 20 Manila

    const lastWeekSession = {
      startedAt: new Date("2026-10-14T02:00:00Z"), // Wed Oct 14 Manila
      focusedSeconds: 2400, // 40 minutes
      tabSwitchCount: 1,
      status: "COMPLETED",
    };

    const thisWeekSession = {
      startedAt: new Date("2026-10-19T02:00:00Z"), // Mon Oct 19 Manila
      focusedSeconds: 1800, // 30 minutes
      tabSwitchCount: 5,
      status: "COMPLETED",
    };

    const summary = aggregateFocusSessions(
      [lastWeekSession, thisWeekSession],
      { focusedSeconds: 2400 },
      null,
      now
    );

    assert.equal(summary.focusedMinutesThisWeek, 30);
    assert.equal(summary.focusedMinutesLastWeek, 40);
    assert.equal(summary.completedSessionsThisWeek, 1);
    assert.equal(summary.averageTabSwitchesThisWeek, 5);
  });

  it("splits a session crossing midnight Manila time across both calendar days", () => {
    // Manila is UTC+8
    // Oct 19 23:45 Manila = Oct 19 15:45 UTC
    // Oct 20 00:15 Manila = Oct 19 16:15 UTC
    const startUtc = new Date("2026-10-19T15:45:00Z");
    const totalSeconds = 1800; // 30 minutes total (15 min on Oct 19, 15 min on Oct 20)

    const daySplits = splitSessionByDay(startUtc, totalSeconds);

    assert.equal(daySplits.length, 2);
    assert.equal(daySplits[0].dateKey, "2026-10-19");
    assert.equal(Math.round(daySplits[0].focusedSeconds / 60), 15);
    assert.equal(daySplits[1].dateKey, "2026-10-20");
    assert.equal(Math.round(daySplits[1].focusedSeconds / 60), 15);
  });
});
