/**
 * apps/web/src/lib/ite/meetings/__tests__/meetings.test.ts
 *
 * Unit tests for ITE Class Meetings:
 * - URL validation (https, no credentials, no localhost, no IP literals, max length)
 * - Provider detection (Google Meet, Zoom, Classroom, Teams, lookalike rejection)
 * - Derived meeting status (8-hour live cutoff, 24-hour scheduled cutoff)
 * - Manila timezone formatting & grouping across UTC midnight boundaries
 * - Duration formatting
 * - Pure access policy decisions
 * - Status transition & edit rules
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateMeetingUrl,
  detectProvider,
  deriveMeetingStatus,
  primaryTime,
  formatMeetingDateTime,
  formatMeetingTimeOnly,
  formatDuration,
  groupMeetingsByManilaDay,
  canManageMeeting,
  canViewMeeting,
  canJoinMeeting,
  canTransitionStatus,
  canEditMeeting,
} from "../pure-logic";

describe("ITE Class Meetings: validateMeetingUrl", () => {
  it("accepts valid Google Meet, Zoom, and Classroom links", () => {
    const meet = validateMeetingUrl("https://meet.google.com/abc-defg-hij");
    assert.equal(meet.valid, true);

    const zoom = validateMeetingUrl("https://us02web.zoom.us/j/1234567890?pwd=xyz");
    assert.equal(zoom.valid, true);

    const classroom = validateMeetingUrl("https://classroom.google.com/c/MTIzNDU2");
    assert.equal(classroom.valid, true);
  });

  it("trims whitespace from input", () => {
    const res = validateMeetingUrl("   https://meet.google.com/abc-defg-hij   ");
    assert.equal(res.valid, true);
    if (res.valid) {
      assert.equal(res.url, "https://meet.google.com/abc-defg-hij");
    }
  });

  it("rejects http URLs", () => {
    const res = validateMeetingUrl("http://meet.google.com/abc");
    assert.equal(res.valid, false);
    if (!res.valid) {
      assert.match(res.error, /https:\/\//i);
    }
  });

  it("rejects dangerous protocols: javascript, data, file", () => {
    assert.equal(validateMeetingUrl("javascript:alert(1)").valid, false);
    assert.equal(validateMeetingUrl("data:text/html,<script>").valid, false);
    assert.equal(validateMeetingUrl("file:///etc/passwd").valid, false);
  });

  it("rejects URLs with embedded credentials (username/password)", () => {
    const res = validateMeetingUrl("https://user:pass@meet.google.com/abc");
    assert.equal(res.valid, false);
    if (!res.valid) {
      assert.match(res.error, /credentials/i);
    }
  });

  it("rejects localhost and localhost subdomains", () => {
    assert.equal(validateMeetingUrl("https://localhost:3000/call").valid, false);
    assert.equal(validateMeetingUrl("https://sub.localhost/call").valid, false);
  });

  it("rejects IP address literals (IPv4 and IPv6)", () => {
    assert.equal(validateMeetingUrl("https://127.0.0.1:3000/call").valid, false);
    assert.equal(validateMeetingUrl("https://192.168.1.1/meet").valid, false);
    assert.equal(validateMeetingUrl("https://[::1]/meet").valid, false);
  });

  it("rejects over-long links exceeding 2,048 characters", () => {
    const longUrl = "https://meet.google.com/" + "a".repeat(2050);
    const res = validateMeetingUrl(longUrl);
    assert.equal(res.valid, false);
    if (!res.valid) {
      assert.match(res.error, /2,048 characters/i);
    }
  });

  it("rejects empty or invalid string inputs", () => {
    assert.equal(validateMeetingUrl("").valid, false);
    assert.equal(validateMeetingUrl("    ").valid, false);
    assert.equal(validateMeetingUrl("not-a-valid-url").valid, false);
    assert.equal(validateMeetingUrl(null).valid, false);
  });
});

describe("ITE Class Meetings: detectProvider", () => {
  it("correctly identifies each standard meeting provider", () => {
    assert.equal(detectProvider("https://meet.google.com/abc-defg-hij"), "GOOGLE_MEET");
    assert.equal(detectProvider("https://classroom.google.com/c/MTIzNDU2"), "GOOGLE_CLASSROOM");
    assert.equal(detectProvider("https://zoom.us/j/123456"), "ZOOM");
    assert.equal(detectProvider("https://myorg.zoom.us/j/123456"), "ZOOM");
    assert.equal(detectProvider("https://zoom.com/j/123456"), "ZOOM");
    assert.equal(detectProvider("https://teams.microsoft.com/l/meetup-join/123"), "MICROSOFT_TEAMS");
    assert.equal(detectProvider("https://teams.live.com/meet/123"), "MICROSOFT_TEAMS");
    assert.equal(detectProvider("https://example.com/conference/123"), "OTHER");
  });

  it("rejects lookalike hosts and attacker domains without false positives", () => {
    assert.equal(detectProvider("https://zoom.us.evil.com/meeting"), "OTHER");
    assert.equal(detectProvider("https://notmeet.google.com.attacker.io/meet"), "OTHER");
    assert.equal(detectProvider("https://evilzoom.us/j/123"), "OTHER");
    assert.equal(detectProvider("https://teams.microsoft.com.spoof.net/call"), "OTHER");
  });
});

describe("ITE Class Meetings: deriveMeetingStatus", () => {
  const baseNow = new Date("2026-10-20T12:00:00.000Z");

  it("keeps LIVE meeting as LIVE when under 8 hours", () => {
    const started3HoursAgo = new Date(baseNow.getTime() - 3 * 60 * 60 * 1000);
    const status = deriveMeetingStatus(
      { status: "LIVE", startedAt: started3HoursAgo },
      baseNow
    );
    assert.equal(status, "LIVE");
  });

  it("derives LIVE meeting as ENDED when live for more than 8 hours", () => {
    const started9HoursAgo = new Date(baseNow.getTime() - 9 * 60 * 60 * 1000);
    const status = deriveMeetingStatus(
      { status: "LIVE", startedAt: started9HoursAgo },
      baseNow
    );
    assert.equal(status, "ENDED");
  });

  it("derives SCHEDULED meeting as ENDED when scheduled more than 24h ago and never started", () => {
    const scheduled26HoursAgo = new Date(baseNow.getTime() - 26 * 60 * 60 * 1000);
    const status = deriveMeetingStatus(
      { status: "SCHEDULED", scheduledAt: scheduled26HoursAgo, startedAt: null },
      baseNow
    );
    assert.equal(status, "ENDED");
  });

  it("keeps SCHEDULED meeting as SCHEDULED when within 24 hours", () => {
    const scheduledTomorrow = new Date(baseNow.getTime() + 12 * 60 * 60 * 1000);
    const status = deriveMeetingStatus(
      { status: "SCHEDULED", scheduledAt: scheduledTomorrow },
      baseNow
    );
    assert.equal(status, "SCHEDULED");
  });

  it("never alters explicit CANCELLED or ENDED stored statuses", () => {
    assert.equal(deriveMeetingStatus({ status: "CANCELLED" }, baseNow), "CANCELLED");
    assert.equal(deriveMeetingStatus({ status: "ENDED" }, baseNow), "ENDED");
  });
});

describe("ITE Class Meetings: Manila Time Boundaries & Grouping", () => {
  it("formats a 23:30 UTC meeting as the next morning in Asia/Manila (UTC+8)", () => {
    // 2026-10-20 23:30:00 UTC = 2026-10-21 07:30:00 PHT
    const utcDate = new Date("2026-10-20T23:30:00.000Z");
    const formatted = formatMeetingDateTime(utcDate);

    assert.equal(formatted, "Wed, Oct 21, 2026 · 7:30 AM");
  });

  it("formats a 16:30 UTC meeting as 00:30 AM midnight in Asia/Manila", () => {
    // 2026-10-20 16:30:00 UTC = 2026-10-21 00:30:00 PHT
    const midnightUtc = new Date("2026-10-20T16:30:00.000Z");
    const formatted = formatMeetingDateTime(midnightUtc);

    assert.equal(formatted, "Wed, Oct 21, 2026 · 12:30 AM");
  });

  it("groups meetings by Manila calendar day and orders newest first", () => {
    const meetingOct20Morning = {
      id: "m1",
      createdAt: "2026-10-20T01:00:00.000Z", // 9:00 AM Oct 20 PHT
      startedAt: "2026-10-20T01:00:00.000Z",
    };
    const meetingOct20Afternoon = {
      id: "m2",
      createdAt: "2026-10-20T06:00:00.000Z", // 2:00 PM Oct 20 PHT
      startedAt: "2026-10-20T06:00:00.000Z",
    };
    const meetingOct21Early = {
      id: "m3",
      createdAt: "2026-10-20T17:00:00.000Z", // 1:00 AM Oct 21 PHT
      startedAt: "2026-10-20T17:00:00.000Z",
    };

    const groups = groupMeetingsByManilaDay([
      meetingOct20Morning,
      meetingOct20Afternoon,
      meetingOct21Early,
    ]);

    assert.equal(groups.length, 2);
    // Group 1: Oct 21 (newest first)
    assert.equal(groups[0].dateKey, "2026-10-21");
    assert.equal(groups[0].meetings.length, 1);
    assert.equal(groups[0].meetings[0].id, "m3");

    // Group 2: Oct 20
    assert.equal(groups[1].dateKey, "2026-10-20");
    assert.equal(groups[1].meetings.length, 2);
    // Inside day: afternoon meeting is before morning meeting
    assert.equal(groups[1].meetings[0].id, "m2");
    assert.equal(groups[1].meetings[1].id, "m1");
  });
});

describe("ITE Class Meetings: formatDuration", () => {
  it("formats minutes only under an hour", () => {
    const start = new Date("2026-10-20T02:00:00.000Z");
    const end = new Date("2026-10-20T02:45:00.000Z");
    assert.equal(formatDuration(start, end), "45 min");
  });

  it("formats hours and minutes over an hour", () => {
    const start = new Date("2026-10-20T02:00:00.000Z");
    const end = new Date("2026-10-20T03:05:00.000Z");
    assert.equal(formatDuration(start, end), "1 h 5 min");
  });

  it("formats exact hours without trailing 0 min", () => {
    const start = new Date("2026-10-20T02:00:00.000Z");
    const end = new Date("2026-10-20T04:00:00.000Z");
    assert.equal(formatDuration(start, end), "2 h");
  });

  it("returns empty string when either timestamp is missing", () => {
    assert.equal(formatDuration(new Date(), null), "");
    assert.equal(formatDuration(null, new Date()), "");
    assert.equal(formatDuration(null, null), "");
  });
});

describe("ITE Class Meetings: Access Control Policies", () => {
  it("allows course owner instructor to manage meetings", () => {
    const allowed = canManageMeeting({
      role: "PROFESSOR",
      instituteCode: "ite",
      courseInstructorId: "prof-1",
      userId: "prof-1",
    });
    assert.equal(allowed, true);
  });

  it("denies another instructor who does not own the course", () => {
    const allowed = canManageMeeting({
      role: "PROFESSOR",
      instituteCode: "ite",
      courseInstructorId: "prof-1",
      userId: "prof-other",
    });
    assert.equal(allowed, false);
  });

  it("denies admins, super users, and ICS/IBE users from managing meetings", () => {
    assert.equal(
      canManageMeeting({ role: "ADMIN", instituteCode: "ite", courseInstructorId: "p1", userId: "p1" }),
      false
    );
    assert.equal(
      canManageMeeting({ role: "PROFESSOR", instituteCode: "ics", courseInstructorId: "p1", userId: "p1" }),
      false
    );
    assert.equal(
      canManageMeeting({ role: "STUDENT", instituteCode: "ite", courseInstructorId: "p1", userId: "p1" }),
      false
    );
  });

  it("allows approved enrolled students and owner instructors to view meeting", () => {
    assert.equal(
      canViewMeeting({ role: "STUDENT", instituteCode: "ite", isEnrolled: true }),
      true
    );
    assert.equal(
      canViewMeeting({ role: "PROFESSOR", instituteCode: "ite", isOwner: true }),
      true
    );
  });

  it("denies unenrolled or non-ITE students from viewing meeting", () => {
    assert.equal(
      canViewMeeting({ role: "STUDENT", instituteCode: "ite", isEnrolled: false }),
      false
    );
    assert.equal(
      canViewMeeting({ role: "STUDENT", instituteCode: "ibe", isEnrolled: true }),
      false
    );
  });

  it("allows joining ONLY when meeting status is LIVE", () => {
    assert.equal(
      canJoinMeeting({
        role: "STUDENT",
        instituteCode: "ite",
        isEnrolled: true,
        status: "LIVE",
      }),
      true
    );
    assert.equal(
      canJoinMeeting({
        role: "STUDENT",
        instituteCode: "ite",
        isEnrolled: true,
        status: "SCHEDULED",
      }),
      false
    );
    assert.equal(
      canJoinMeeting({
        role: "STUDENT",
        instituteCode: "ite",
        isEnrolled: true,
        status: "ENDED",
      }),
      false
    );
    assert.equal(
      canJoinMeeting({
        role: "STUDENT",
        instituteCode: "ite",
        isEnrolled: true,
        status: "CANCELLED",
      }),
      false
    );
  });
});

describe("ITE Class Meetings: Status Transitions & Edit Rules", () => {
  it("allows SCHEDULED -> LIVE (start)", () => {
    assert.equal(canTransitionStatus("SCHEDULED", "LIVE"), true);
  });

  it("allows SCHEDULED -> CANCELLED (cancel)", () => {
    assert.equal(canTransitionStatus("SCHEDULED", "CANCELLED"), true);
  });

  it("allows LIVE -> ENDED (end)", () => {
    assert.equal(canTransitionStatus("LIVE", "ENDED"), true);
  });

  it("rejects illegal transitions (ENDED -> LIVE, CANCELLED -> LIVE, etc.)", () => {
    assert.equal(canTransitionStatus("ENDED", "LIVE"), false);
    assert.equal(canTransitionStatus("CANCELLED", "LIVE"), false);
    assert.equal(canTransitionStatus("LIVE", "SCHEDULED"), false);
  });

  it("allows editing for SCHEDULED and LIVE, but forbids editing for ENDED and CANCELLED", () => {
    assert.equal(canEditMeeting("SCHEDULED"), true);
    assert.equal(canEditMeeting("LIVE"), true);
    assert.equal(canEditMeeting("ENDED"), false);
    assert.equal(canEditMeeting("CANCELLED"), false);
  });
});
