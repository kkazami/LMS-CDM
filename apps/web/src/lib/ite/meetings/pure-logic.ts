/**
 * apps/web/src/lib/ite/meetings/pure-logic.ts
 *
 * Pure validation, provider detection, status derivation, Manila formatting,
 * and access policy helpers for ITE Class Meetings.
 * Zero database calls, zero network calls, strictly deterministic.
 */

import type { MeetingProvider, MeetingStatus } from "@prisma/client";

export const MANILA_TIMEZONE = "Asia/Manila";
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Validates a meeting URL:
 * - Must be a string up to 2,048 characters.
 * - Must parse as a valid URL.
 * - Protocol must be strictly https (rejects http, javascript:, data:, file:, etc.).
 * - Must not contain embedded username or password.
 * - Must not target localhost or IP address literals (IPv4 or IPv6).
 */
export function validateMeetingUrl(
  input: unknown
): { valid: true; url: string } | { valid: false; error: string } {
  if (typeof input !== "string") {
    return { valid: false, error: "Meeting link must be a valid URL string." };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Meeting link cannot be empty." };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: "Meeting link must not exceed 2,048 characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Please enter a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Meeting link must use a secure https:// address." };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: "Meeting link cannot contain embedded credentials." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { valid: false, error: "Localhost addresses are not permitted." };
  }

  // Reject IPv4 literals (e.g. 127.0.0.1, 192.168.1.1)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return { valid: false, error: "IP address links are not permitted." };
  }

  // Reject IPv6 literals (e.g. [::1], starts with [ or contains :)
  if (hostname.startsWith("[") || hostname.includes(":")) {
    return { valid: false, error: "IP address links are not permitted." };
  }

  return { valid: true, url: parsed.toString() };
}

/**
 * Detects the meeting provider from a URL hostname.
 * Uses exact match or true subdomain match to prevent spoofing (e.g. zoom.us.attacker.com).
 */
export function detectProvider(rawUrl: string): MeetingProvider {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();

    const isDomainOrSubdomain = (target: string): boolean => {
      return host === target || host.endsWith("." + target);
    };

    if (isDomainOrSubdomain("meet.google.com")) {
      return "GOOGLE_MEET";
    }

    if (isDomainOrSubdomain("classroom.google.com")) {
      return "GOOGLE_CLASSROOM";
    }

    if (isDomainOrSubdomain("zoom.us") || isDomainOrSubdomain("zoom.com")) {
      return "ZOOM";
    }

    if (isDomainOrSubdomain("teams.microsoft.com") || isDomainOrSubdomain("teams.live.com")) {
      return "MICROSOFT_TEAMS";
    }

    return "OTHER";
  } catch {
    return "OTHER";
  }
}

export interface MeetingStatusInput {
  status: MeetingStatus;
  startedAt?: Date | string | null;
  scheduledAt?: Date | string | null;
}

/**
 * Derives the active display status for a meeting:
 * - The stored status wins except:
 *   - A LIVE meeting live for > 8 hours is treated as ENDED.
 *   - A SCHEDULED meeting scheduled > 24 hours in the past that was never started is treated as ENDED.
 * - Stored ENDED and CANCELLED statuses are strictly final.
 */
export function deriveMeetingStatus(meeting: MeetingStatusInput, now: Date = new Date()): MeetingStatus {
  if (meeting.status === "ENDED" || meeting.status === "CANCELLED") {
    return meeting.status;
  }

  const nowMs = now.getTime();

  if (meeting.status === "LIVE") {
    if (meeting.startedAt) {
      const startedMs = new Date(meeting.startedAt).getTime();
      if (nowMs - startedMs > EIGHT_HOURS_MS) {
        return "ENDED";
      }
    }
    return "LIVE";
  }

  if (meeting.status === "SCHEDULED") {
    if (meeting.scheduledAt && !meeting.startedAt) {
      const scheduledMs = new Date(meeting.scheduledAt).getTime();
      if (nowMs - scheduledMs > TWENTY_FOUR_HOURS_MS) {
        return "ENDED";
      }
    }
    return "SCHEDULED";
  }

  return meeting.status;
}

/**
 * Returns the primary timestamp of a meeting:
 * startedAt if available, else scheduledAt if available, else createdAt.
 */
export function primaryTime(meeting: {
  startedAt?: Date | string | null;
  scheduledAt?: Date | string | null;
  createdAt: Date | string;
}): Date {
  if (meeting.startedAt) return new Date(meeting.startedAt);
  if (meeting.scheduledAt) return new Date(meeting.scheduledAt);
  return new Date(meeting.createdAt);
}

/**
 * Formats a Date in Asia/Manila timezone (PHT, UTC+8):
 * e.g. "Tue, Oct 20, 2026 · 2:30 PM"
 */
export function formatMeetingDateTime(date: Date | string): string {
  const d = new Date(date);
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return `${datePart} · ${timePart}`;
}

/**
 * Formats only the date portion in Asia/Manila:
 * e.g. "Tue, Oct 20, 2026"
 */
export function formatMeetingDateOnly(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Formats only the time portion in Asia/Manila:
 * e.g. "2:30 PM"
 */
export function formatMeetingTimeOnly(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats duration between startedAt and endedAt:
 * Returns e.g. "45 min" or "1 h 5 min", or empty string when either is missing.
 */
export function formatDuration(
  startedAt?: Date | string | null,
  endedAt?: Date | string | null
): string {
  if (!startedAt || !endedAt) return "";

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return "";

  const totalMinutes = Math.round((endMs - startMs) / 60000);
  if (totalMinutes <= 0) return "1 min";

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  if (remMinutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remMinutes} min`;
}

export interface DayGroup<T> {
  dateKey: string;
  dateLabel: string;
  meetings: T[];
}

/**
 * Groups an array of meetings by Manila calendar day, sorted newest first.
 */
export function groupMeetingsByManilaDay<
  T extends {
    startedAt?: Date | string | null;
    scheduledAt?: Date | string | null;
    createdAt: Date | string;
  }
>(meetings: T[]): DayGroup<T>[] {
  const groupsMap = new Map<string, { dateLabel: string; primaryTimestamp: number; meetings: T[] }>();

  for (const m of meetings) {
    const pt = primaryTime(m);
    // Extract YYYY-MM-DD in Asia/Manila
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TIMEZONE }).format(pt);
    const dateLabel = formatMeetingDateOnly(pt);

    const existing = groupsMap.get(dateKey);
    if (!existing) {
      groupsMap.set(dateKey, {
        dateLabel,
        primaryTimestamp: pt.getTime(),
        meetings: [m],
      });
    } else {
      existing.meetings.push(m);
      if (pt.getTime() > existing.primaryTimestamp) {
        existing.primaryTimestamp = pt.getTime();
      }
    }
  }

  // Sort groups newest dateKey first (descending YYYY-MM-DD)
  const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const group = groupsMap.get(key)!;
    // Sort meetings inside the day newest primary time first
    group.meetings.sort((a, b) => primaryTime(b).getTime() - primaryTime(a).getTime());
    return {
      dateKey: key,
      dateLabel: group.dateLabel,
      meetings: group.meetings,
    };
  });
}

/**
 * Pure access decision helpers.
 */
export function canManageMeeting(input: {
  role?: string | null;
  instituteCode?: string | null;
  courseInstructorId?: string | null;
  userId?: string | null;
}): boolean {
  const inst = (input.instituteCode || "").toLowerCase().trim();
  if (inst !== "ite") return false;

  const r = (input.role || "").toUpperCase().trim();
  if (r !== "PROFESSOR" && r !== "TEACHER") return false;

  if (!input.userId || !input.courseInstructorId) return false;
  return input.userId === input.courseInstructorId;
}

export function canViewMeeting(input: {
  role?: string | null;
  instituteCode?: string | null;
  isEnrolled?: boolean;
  isOwner?: boolean;
}): boolean {
  const inst = (input.instituteCode || "").toLowerCase().trim();
  if (inst !== "ite") return false;

  const r = (input.role || "").toUpperCase().trim();
  if (r === "PROFESSOR" || r === "TEACHER") {
    return Boolean(input.isOwner);
  }

  if (r === "STUDENT") {
    return Boolean(input.isEnrolled);
  }

  return false;
}

export function canJoinMeeting(input: {
  role?: string | null;
  instituteCode?: string | null;
  isEnrolled?: boolean;
  isOwner?: boolean;
  status: MeetingStatus;
}): boolean {
  if (!canViewMeeting(input)) return false;
  return input.status === "LIVE";
}

/**
 * Validates allowed status transitions.
 */
export function canTransitionStatus(
  currentStatus: MeetingStatus,
  targetStatus: MeetingStatus
): boolean {
  if (currentStatus === "SCHEDULED" && (targetStatus === "LIVE" || targetStatus === "CANCELLED")) {
    return true;
  }
  if (currentStatus === "LIVE" && targetStatus === "ENDED") {
    return true;
  }
  return false;
}

export function canEditMeeting(status: MeetingStatus): boolean {
  return status === "SCHEDULED" || status === "LIVE";
}

/**
 * Formats attendee/student count with correct singular/plural phrasing.
 * e.g., 0 -> "0 students", 1 -> "1 student", 2 -> "2 students"
 * When action suffix is provided (e.g. "joined"), appends it:
 * formatMeetingAttendeesCount(1, "joined") -> "1 student joined"
 * formatMeetingAttendeesCount(2, "joined") -> "2 students joined"
 */
export function formatMeetingAttendeesCount(count: number, suffix?: string): string {
  const noun = Math.abs(count) === 1 ? "student" : "students";
  return suffix ? `${count} ${noun} ${suffix}` : `${count} ${noun}`;
}

