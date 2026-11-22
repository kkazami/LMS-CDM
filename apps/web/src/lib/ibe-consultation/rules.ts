/**
 * Pure domain rules and validation logic for the IBE Consultation & Appointment Scheduling System.
 * Keeps no database or Next.js runtime dependencies so all rules can be unit-tested directly.
 */

import {
  ATTENDANCE_OUTCOMES,
  AVAILABILITY_MEETING_TYPES,
  CONSULTATION_MEETING_TYPES,
  CONSULTATION_STATUSES,
  SLOT_DURATIONS,
  type AttendanceOutcome,
  type AvailabilityMeetingType,
  type AvailableSlotDTO,
  type ConsultationActorRole,
  type ConsultationMeetingType,
  type ConsultationStatus,
  type InstructorAvailabilityDTO,
  type InstructorBlockedDateDTO,
  type SlotDurationMinutes,
} from "./types";

export const IBE_CONSULTATION_INSTITUTE_CODE = "ibe";
export const MANILA_TIMEZONE = "Asia/Manila";
export const MAX_CONSULTATION_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES = WEEKDAY_NAMES;
export const MAX_ATTACHMENT_BYTES = MAX_CONSULTATION_ATTACHMENT_BYTES;

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  ".pdf",
  ".doc",
  ".docx",
] as const;
export type AllowedAttachmentExtension = "pdf" | "doc" | "docx";

export const ALLOWED_ATTACHMENT_MIME_BY_EXT: Record<
  AllowedAttachmentExtension,
  readonly string[]
> = {
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/vnd.ms-word"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

// ─── Eligibility ─────────────────────────────────────────────────────────────

export interface ConsultationEligibilityCandidate {
  role?: string | null;
  institute?: { code?: string | null } | null;
  instituteCode?: string | null;
  isActive?: boolean | null;
  activationStatus?: string | null;
  isSuperUser?: boolean | null;
}

export function normalizeConsultationRole(
  rawRole?: string | null
): ConsultationActorRole | null {
  const r = (rawRole ?? "").trim().toUpperCase();
  if (r === "STUDENT") return "STUDENT";
  if (r === "PROFESSOR" || r === "TEACHER" || r === "INSTRUCTOR") {
    return "INSTRUCTOR";
  }
  return null;
}

/**
 * Verifies whether a user is eligible for the IBE Consultation & Appointment Scheduling System.
 * Strictly exclusive to active IBE students and IBE instructors.
 * Rejects ICS, ITE, ADMIN, SUPER_USER, and inactive accounts.
 */
export function checkIbeConsultationEligibility(
  candidate: ConsultationEligibilityCandidate | null | undefined
):
  | { eligible: true; role: ConsultationActorRole }
  | { eligible: false; reason: string } {
  if (!candidate) {
    return { eligible: false, reason: "Authentication required." };
  }
  if (candidate.isSuperUser) {
    return {
      eligible: false,
      reason: "IBE Consultation & Scheduling is exclusive to IBE students and instructors.",
    };
  }
  if (candidate.isActive === false) {
    return {
      eligible: false,
      reason: "Your account has been deactivated.",
    };
  }
  if (
    candidate.activationStatus &&
    candidate.activationStatus.toUpperCase() !== "ACTIVE"
  ) {
    return {
      eligible: false,
      reason: "Your account is not active.",
    };
  }

  const instituteCode = (
    candidate.institute?.code ??
    candidate.instituteCode ??
    ""
  )
    .trim()
    .toLowerCase();

  if (instituteCode !== IBE_CONSULTATION_INSTITUTE_CODE) {
    return {
      eligible: false,
      reason:
        "Forbidden: IBE Consultation & Scheduling is available exclusively to the Institute of Business and Entrepreneurship (IBE).",
    };
  }

  const role = normalizeConsultationRole(candidate.role);
  if (!role) {
    return {
      eligible: false,
      reason:
        "Forbidden: Only IBE students and IBE instructors can access Consultation & Scheduling.",
    };
  }

  return { eligible: true, role };
}

// ─── Asia/Manila Date & Time Utilities ───────────────────────────────────────

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateKey(dateKey: string): boolean {
  if (!DATE_KEY_REGEX.test(dateKey)) return false;
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function parseTimeMinutes(timeHm: string): number | null {
  const match = TIME_HM_REGEX.exec(timeHm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(totalMinutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatTime12h(timeHm: string): string {
  const mins = parseTimeMinutes(timeHm);
  if (mins === null) return timeHm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Formats a Date or ISO string into "YYYY-MM-DD" in Asia/Manila (UTC+08:00).
 */
export function toManilaDateKey(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const manilaMs = date.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const y = manilaDate.getUTCFullYear();
  const m = String(manilaDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(manilaDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date or ISO string into "HH:mm" (24h) in Asia/Manila (UTC+08:00).
 */
export function toManilaTimeString(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const manilaMs = date.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const hh = String(manilaDate.getUTCHours()).padStart(2, "0");
  const mm = String(manilaDate.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Converts a dateKey ("YYYY-MM-DD") and time ("HH:mm") in Asia/Manila (+08:00) to a UTC Date.
 */
export function manilaDateTimeToUtc(dateKey: string, timeHm: string): Date {
  return new Date(`${dateKey}T${timeHm}:00+08:00`);
}

export function buildManilaDateTime(dateKey: string, timeHm: string): Date | null {
  if (!isValidDateKey(dateKey) || parseTimeMinutes(timeHm) === null) return null;
  return manilaDateTimeToUtc(dateKey, timeHm);
}

/**
 * Returns the day of week (0 = Sunday .. 6 = Saturday) for a "YYYY-MM-DD" date key or Date in Asia/Manila.
 */
export function getManilaDayOfWeek(input: string | Date): number {
  const dateKey = typeof input === "string" && isValidDateKey(input)
    ? input
    : toManilaDateKey(input);
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatManilaTimeRangeLabel(
  start: Date | string,
  end: Date | string
): string {
  const s = toManilaTimeString(start);
  const e = toManilaTimeString(end);
  return `${formatTime12h(s)} – ${formatTime12h(e)}`;
}

export const formatManilaTimeRange = formatManilaTimeRangeLabel;
export const formatTimeLabel = formatTime12h;
export const formatManilaDateInput = toManilaDateKey;

export function formatManilaDateDisplay(dateKey: string): string {
  if (!isValidDateKey(dateKey)) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatManilaDate(input: Date | string): string {
  if (typeof input === "string" && isValidDateKey(input)) {
    return formatManilaDateDisplay(input);
  }
  return formatManilaDateDisplay(toManilaDateKey(input));
}

// ─── Availability Validation & Overlap Checks ────────────────────────────────

export interface AvailabilityInput {
  dayOfWeek: unknown;
  startTime: unknown;
  endTime: unknown;
  slotDuration: unknown;
  maxAppointmentsPerDay?: unknown;
  meetingType: unknown;
  location?: unknown;
  meetingLink?: unknown;
  isActive?: unknown;
  isSuspended?: unknown;
}

export interface ValidatedAvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: SlotDurationMinutes;
  maxAppointmentsPerDay: number;
  meetingType: AvailabilityMeetingType;
  location: string;
  meetingLink: string;
  isActive: boolean;
  isSuspended: boolean;
}

export function validateAvailabilityInput(
  raw: AvailabilityInput
):
  | { ok: true; value: ValidatedAvailabilityInput }
  | { ok: false; error: string } {
  const dayOfWeek = Number(raw.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return {
      ok: false,
      error: "Please select a valid day of the week (Sunday through Saturday).",
    };
  }

  const startTime =
    typeof raw.startTime === "string" ? raw.startTime.trim() : "";
  const endTime = typeof raw.endTime === "string" ? raw.endTime.trim() : "";
  const startMins = parseTimeMinutes(startTime);
  const endMins = parseTimeMinutes(endTime);

  if (startMins === null || endMins === null) {
    return {
      ok: false,
      error: "Start time and end time must be valid 24-hour times (HH:mm).",
    };
  }

  if (endMins <= startMins) {
    return {
      ok: false,
      error: "End time must be later than start time.",
    };
  }

  const slotDuration = Number(raw.slotDuration) as SlotDurationMinutes;
  if (!(SLOT_DURATIONS as readonly number[]).includes(slotDuration)) {
    return {
      ok: false,
      error: "Appointment duration must be 15, 30, or 60 minutes.",
    };
  }

  if (endMins - startMins < slotDuration) {
    return {
      ok: false,
      error: `The availability window must be at least ${slotDuration} minutes long.`,
    };
  }

  const maxAppointmentsPerDay =
    raw.maxAppointmentsPerDay === undefined || raw.maxAppointmentsPerDay === null
      ? 8
      : Number(raw.maxAppointmentsPerDay);

  if (
    !Number.isInteger(maxAppointmentsPerDay) ||
    maxAppointmentsPerDay < 1 ||
    maxAppointmentsPerDay > 50
  ) {
    return {
      ok: false,
      error: "Maximum appointments per day must be between 1 and 50.",
    };
  }

  const meetingType = (
    typeof raw.meetingType === "string" ? raw.meetingType.trim().toUpperCase() : ""
  ) as AvailabilityMeetingType;

  if (!(AVAILABILITY_MEETING_TYPES as readonly string[]).includes(meetingType)) {
    return {
      ok: false,
      error: "Meeting type must be FACE_TO_FACE, ONLINE, or BOTH.",
    };
  }

  const location =
    typeof raw.location === "string" ? raw.location.trim().slice(0, 300) : "";
  const meetingLink =
    typeof raw.meetingLink === "string"
      ? raw.meetingLink.trim().slice(0, 500)
      : "";

  if (
    (meetingType === "FACE_TO_FACE" || meetingType === "BOTH") &&
    !location
  ) {
    return {
      ok: false,
      error:
        "Please provide a consultation room or office location for face-to-face consultations.",
    };
  }

  if (meetingLink) {
    try {
      const parsed = new URL(meetingLink);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return {
          ok: false,
          error: "Online meeting link must be a valid http(s) URL.",
        };
      }
    } catch {
      // Allow descriptive online meeting text or valid URLs
    }
  }

  const isActive = raw.isActive === undefined ? true : Boolean(raw.isActive);
  const isSuspended =
    raw.isSuspended === undefined ? false : Boolean(raw.isSuspended);

  return {
    ok: true,
    value: {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      maxAppointmentsPerDay,
      meetingType,
      location,
      meetingLink,
      isActive,
      isSuspended,
    },
  };
}

/**
 * Checks whether a candidate availability window overlaps any existing availability
 * on the same day of week for the same instructor.
 */
export function findOverlappingAvailability(
  candidate: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  },
  existing: ReadonlyArray<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  excludeId?: string
): { id: string; startTime: string; endTime: string } | null {
  const candStart = parseTimeMinutes(candidate.startTime);
  const candEnd = parseTimeMinutes(candidate.endTime);
  if (candStart === null || candEnd === null) return null;

  for (const row of existing) {
    if (excludeId && row.id === excludeId) continue;
    if (row.dayOfWeek !== candidate.dayOfWeek) continue;
    const rowStart = parseTimeMinutes(row.startTime);
    const rowEnd = parseTimeMinutes(row.endTime);
    if (rowStart === null || rowEnd === null) continue;
    if (candStart < rowEnd && candEnd > rowStart) {
      return { id: row.id, startTime: row.startTime, endTime: row.endTime };
    }
  }
  return null;
}

// ─── Time-Slot Conflict & Slot Generation ────────────────────────────────────

export function intervalsOverlap(
  startA: Date | number,
  endA: Date | number,
  startB: Date | number,
  endB: Date | number
): boolean {
  const sA = typeof startA === "number" ? startA : startA.getTime();
  const eA = typeof endA === "number" ? endA : endA.getTime();
  const sB = typeof startB === "number" ? startB : startB.getTime();
  const eB = typeof endB === "number" ? endB : endB.getTime();
  return sA < eB && eA > sB;
}

export interface AppointmentSlotWindow {
  id: string;
  status: string;
  requestedStartAt: Date | string;
  requestedEndAt: Date | string;
  proposedStartAt?: Date | string | null;
  proposedEndAt?: Date | string | null;
}

export function getEffectiveWindow(appt: AppointmentSlotWindow): {
  startAt: Date;
  endAt: Date;
} {
  if (
    (appt.status === "RESCHEDULE_REQUESTED" || appt.status === "CONFIRMED") &&
    appt.proposedStartAt &&
    appt.proposedEndAt
  ) {
    return {
      startAt: new Date(appt.proposedStartAt),
      endAt: new Date(appt.proposedEndAt),
    };
  }
  return {
    startAt: new Date(appt.requestedStartAt),
    endAt: new Date(appt.requestedEndAt),
  };
}

/**
 * Returns the conflicting appointment if any APPROVED or CONFIRMED appointment overlaps [targetStart, targetEnd).
 */
export function findConflictingAppointment(
  targetStart: Date,
  targetEnd: Date,
  appointments: readonly AppointmentSlotWindow[],
  excludeAppointmentId?: string
): AppointmentSlotWindow | null {
  for (const appt of appointments) {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
    if (appt.status !== "APPROVED" && appt.status !== "CONFIRMED") continue;
    const { startAt, endAt } = getEffectiveWindow(appt);
    if (intervalsOverlap(targetStart, targetEnd, startAt, endAt)) {
      return appt;
    }
  }
  return null;
}

/**
 * Generates all consultation time slots for an instructor on a given Asia/Manila dateKey ("YYYY-MM-DD").
 */
export function computeAvailableSlotsForDate(params: {
  dateKey: string;
  availabilities: readonly InstructorAvailabilityDTO[];
  blockedDates: readonly InstructorBlockedDateDTO[];
  existingAppointments: readonly AppointmentSlotWindow[];
  now?: Date;
}): AvailableSlotDTO[] {
  const { dateKey, availabilities, blockedDates, existingAppointments } = params;
  if (!isValidDateKey(dateKey)) return [];

  const dayOfWeek = getManilaDayOfWeek(dateKey);
  const matchingAvailabilities = availabilities
    .filter((a) => a.dayOfWeek === dayOfWeek && a.isActive && !a.isSuspended)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (matchingAvailabilities.length === 0) return [];

  // Count how many APPROVED / CONFIRMED appointments already exist on this dateKey for the instructor
  const confirmedOnDateCount = existingAppointments.filter((appt) => {
    if (appt.status !== "APPROVED" && appt.status !== "CONFIRMED") return false;
    const { startAt } = getEffectiveWindow(appt);
    return toManilaDateKey(startAt) === dateKey;
  }).length;

  const slots: AvailableSlotDTO[] = [];

  for (const avail of matchingAvailabilities) {
    const startMins = parseTimeMinutes(avail.startTime);
    const endMins = parseTimeMinutes(avail.endTime);
    if (startMins === null || endMins === null) continue;

    for (
      let cursor = startMins;
      cursor + avail.slotDuration <= endMins;
      cursor += avail.slotDuration
    ) {
      const slotStartHm = formatMinutesToTime(cursor);
      const slotEndHm = formatMinutesToTime(cursor + avail.slotDuration);
      const slotStartUtc = manilaDateTimeToUtc(dateKey, slotStartHm);
      const slotEndUtc = manilaDateTimeToUtc(dateKey, slotEndHm);

      let isAvailable = true;
      let unavailableReason: string | undefined;

      // 1. Check blocked dates
      const blocked = blockedDates.find((b) =>
        intervalsOverlap(
          slotStartUtc,
          slotEndUtc,
          new Date(b.startAt),
          new Date(b.endAt)
        )
      );
      if (blocked) {
        isAvailable = false;
        unavailableReason = blocked.reason
          ? `Blocked: ${blocked.reason}`
          : "Instructor unavailable on this date/time";
      }

      // 2. Check max appointments per day
      if (isAvailable && confirmedOnDateCount >= avail.maxAppointmentsPerDay) {
        isAvailable = false;
        unavailableReason = `Daily appointment limit (${avail.maxAppointmentsPerDay}) reached`;
      }

      // 3. Check conflicting APPROVED or CONFIRMED appointments
      if (isAvailable) {
        const conflict = findConflictingAppointment(
          slotStartUtc,
          slotEndUtc,
          existingAppointments
        );
        if (conflict) {
          isAvailable = false;
          unavailableReason = "Already booked";
        }
      }

      slots.push({
        availabilityId: avail.id,
        dateKey,
        startTime: slotStartHm,
        endTime: slotEndHm,
        startAt: slotStartUtc.toISOString(),
        endAt: slotEndUtc.toISOString(),
        label: formatManilaTimeRangeLabel(slotStartUtc, slotEndUtc),
        slotDuration: avail.slotDuration,
        meetingType: avail.meetingType,
        location: avail.location,
        meetingLink: avail.meetingLink,
        isAvailable,
        available: isAvailable,
        unavailableReason,
      });
    }
  }

  return slots;
}

// ─── Attachment Validation (PDF, DOC, DOCX) ──────────────────────────────────

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase();
}

export function validateConsultationAttachmentMeta(params: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): { ok: true; ext: AllowedAttachmentExtension } | { ok: false; error: string } {
  const { fileName, mimeType, fileSize } = params;
  const ext = getFileExtension(fileName) as AllowedAttachmentExtension;

  if (!(ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error:
        "Unsupported file format. Only PDF (.pdf), Word (.doc), and Word (.docx) documents are allowed.",
    };
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return {
      ok: false,
      error: "The uploaded file is empty.",
    };
  }

  if (fileSize > MAX_CONSULTATION_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: "File exceeds the maximum allowed size of 10 MB.",
    };
  }

  const normalizedMime = (mimeType || "").trim().toLowerCase();
  const allowedMimes = ALLOWED_ATTACHMENT_MIME_BY_EXT[ext];
  // Allow application/octet-stream only if binary content inspection passes later,
  // but reject explicitly mismatched MIME types.
  if (
    normalizedMime &&
    normalizedMime !== "application/octet-stream" &&
    !allowedMimes.includes(normalizedMime)
  ) {
    return {
      ok: false,
      error: `File MIME type (${normalizedMime}) does not match the .${ext} extension.`,
    };
  }

  return { ok: true, ext };
}

/**
 * Inspects file magic bytes and structure to verify genuine PDF, DOC (OLE2 CFBF), or DOCX (OOXML ZIP) content.
 */
export function validateConsultationAttachmentBytes(
  bytes: Uint8Array,
  fileName: string,
  declaredMimeType: string
):
  | { ok: true; canonicalMimeType: string; ext: AllowedAttachmentExtension }
  | { ok: false; error: string } {
  const metaCheck = validateConsultationAttachmentMeta({
    fileName,
    mimeType: declaredMimeType,
    fileSize: bytes.byteLength,
  });
  if (!metaCheck.ok) return metaCheck;

  const { ext } = metaCheck;

  if (bytes.byteLength < 8) {
    return {
      ok: false,
      error: "The uploaded file is corrupted or too small to be a valid document.",
    };
  }

  if (ext === "pdf") {
    // PDF magic header: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d;
    if (!isPdf) {
      return {
        ok: false,
        error: "Invalid PDF document: file content does not match the PDF signature.",
      };
    }
    return { ok: true, canonicalMimeType: "application/pdf", ext: "pdf" };
  }

  if (ext === "doc") {
    // Microsoft Compound File Binary Format (OLE2): D0 CF 11 E0 A1 B1 1A E1
    const isOle2 =
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1;
    if (!isOle2) {
      return {
        ok: false,
        error:
          "Invalid .doc document: file content does not match the Microsoft Word binary signature.",
      };
    }
    return { ok: true, canonicalMimeType: "application/msword", ext: "doc" };
  }

  if (ext === "docx") {
    // OOXML ZIP archive: 50 4B 03 04 ("PK\x03\x04")
    const isZip =
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04;
    if (!isZip) {
      return {
        ok: false,
        error:
          "Invalid .docx document: file content does not match the OpenXML package signature.",
      };
    }
    // Check that the archive mentions [Content_Types].xml
    const asciiPreview = Buffer.from(bytes).toString("latin1");
    if (!asciiPreview.includes("[Content_Types].xml")) {
      return {
        ok: false,
        error:
          "Invalid .docx document: missing OpenXML [Content_Types].xml structure.",
      };
    }
    return {
      ok: true,
      canonicalMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ext: "docx",
    };
  }

  return { ok: false, error: "Unsupported document type." };
}

// ─── Appointment Access & Status Transitions ─────────────────────────────────

export function canAccessAppointment(
  actor: { userId: string; role: ConsultationActorRole; instituteCode: string },
  appointment: { studentId: string; instructorId: string }
): boolean {
  if (actor.instituteCode.toLowerCase() !== IBE_CONSULTATION_INSTITUTE_CODE) {
    return false;
  }
  if (actor.role === "STUDENT") {
    return actor.userId === appointment.studentId;
  }
  if (actor.role === "INSTRUCTOR") {
    return actor.userId === appointment.instructorId;
  }
  return false;
}

export type AppointmentMutationAction =
  | "APPROVE"
  | "REJECT"
  | "PROPOSE_RESCHEDULE"
  | "ACCEPT_RESCHEDULE"
  | "DECLINE_RESCHEDULE"
  | "CONFIRM"
  | "CANCEL"
  | "COMPLETE"
  | "MARK_NO_SHOW";

export interface StatusTransitionCheckInput {
  currentStatus: ConsultationStatus;
  action: AppointmentMutationAction;
  actorRole: ConsultationActorRole;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  proposedStartAt?: Date | null;
  proposedEndAt?: Date | null;
}

export interface StatusTransitionCheckSuccess {
  ok: true;
  nextStatus: ConsultationStatus;
  attendanceOutcome?: AttendanceOutcome;
}

export function validateStatusTransition(
  input: StatusTransitionCheckInput
): StatusTransitionCheckSuccess | { ok: false; error: string } {
  const { currentStatus, action, actorRole } = input;

  if (!(CONSULTATION_STATUSES as readonly string[]).includes(currentStatus)) {
    return { ok: false, error: "Invalid current appointment status." };
  }

  switch (action) {
    case "APPROVE": {
      if (actorRole !== "INSTRUCTOR") {
        return {
          ok: false,
          error: "Only the assigned instructor can approve a consultation request.",
        };
      }
      if (
        currentStatus !== "PENDING" &&
        currentStatus !== "RESCHEDULE_REQUESTED"
      ) {
        return {
          ok: false,
          error: `Cannot approve an appointment in ${currentStatus} status.`,
        };
      }
      return { ok: true, nextStatus: "APPROVED" };
    }

    case "REJECT": {
      if (actorRole !== "INSTRUCTOR") {
        return {
          ok: false,
          error: "Only the assigned instructor can reject a consultation request.",
        };
      }
      if (
        currentStatus !== "PENDING" &&
        currentStatus !== "RESCHEDULE_REQUESTED"
      ) {
        return {
          ok: false,
          error: `Cannot reject an appointment in ${currentStatus} status.`,
        };
      }
      if (!input.rejectionReason || !input.rejectionReason.trim()) {
        return {
          ok: false,
          error: "A rejection reason is required when declining a consultation request.",
        };
      }
      return { ok: true, nextStatus: "REJECTED" };
    }

    case "PROPOSE_RESCHEDULE": {
      if (actorRole !== "INSTRUCTOR") {
        return {
          ok: false,
          error: "Only the assigned instructor can propose a new schedule.",
        };
      }
      if (
        currentStatus !== "PENDING" &&
        currentStatus !== "APPROVED" &&
        currentStatus !== "CONFIRMED" &&
        currentStatus !== "RESCHEDULE_REQUESTED"
      ) {
        return {
          ok: false,
          error: `Cannot propose another schedule for an appointment in ${currentStatus} status.`,
        };
      }
      if (
        !input.proposedStartAt ||
        !input.proposedEndAt ||
        isNaN(input.proposedStartAt.getTime()) ||
        isNaN(input.proposedEndAt.getTime()) ||
        input.proposedEndAt <= input.proposedStartAt
      ) {
        return {
          ok: false,
          error: "Please provide a valid proposed date and time window.",
        };
      }
      return { ok: true, nextStatus: "RESCHEDULE_REQUESTED" };
    }

    case "ACCEPT_RESCHEDULE": {
      if (actorRole !== "STUDENT") {
        return {
          ok: false,
          error: "Only the student can accept a proposed schedule.",
        };
      }
      if (currentStatus !== "RESCHEDULE_REQUESTED") {
        return {
          ok: false,
          error:
            "This appointment does not have a pending proposed schedule to accept.",
        };
      }
      return { ok: true, nextStatus: "CONFIRMED" };
    }

    case "DECLINE_RESCHEDULE": {
      if (actorRole !== "STUDENT") {
        return {
          ok: false,
          error: "Only the student can decline a proposed schedule.",
        };
      }
      if (currentStatus !== "RESCHEDULE_REQUESTED") {
        return {
          ok: false,
          error:
            "This appointment does not have a pending proposed schedule to decline.",
        };
      }
      return { ok: true, nextStatus: "CANCELLED" };
    }

    case "CONFIRM": {
      if (actorRole !== "STUDENT" && actorRole !== "INSTRUCTOR") {
        return { ok: false, error: "Unauthorized." };
      }
      if (currentStatus !== "APPROVED") {
        return {
          ok: false,
          error: `Only APPROVED appointments can be marked CONFIRMED (current: ${currentStatus}).`,
        };
      }
      return { ok: true, nextStatus: "CONFIRMED" };
    }

    case "CANCEL": {
      if (
        currentStatus === "COMPLETED" ||
        currentStatus === "REJECTED" ||
        currentStatus === "CANCELLED"
      ) {
        return {
          ok: false,
          error: `Cannot cancel an appointment that is already ${currentStatus}.`,
        };
      }
      if (!input.cancellationReason || !input.cancellationReason.trim()) {
        return {
          ok: false,
          error: "Please provide a reason for cancelling the appointment.",
        };
      }
      return { ok: true, nextStatus: "CANCELLED" };
    }

    case "COMPLETE": {
      if (actorRole !== "INSTRUCTOR") {
        return {
          ok: false,
          error: "Only the instructor can mark a consultation as completed.",
        };
      }
      if (currentStatus !== "APPROVED" && currentStatus !== "CONFIRMED") {
        return {
          ok: false,
          error:
            "Only approved or confirmed appointments can be marked as completed.",
        };
      }
      return {
        ok: true,
        nextStatus: "COMPLETED",
        attendanceOutcome: "COMPLETED",
      };
    }

    case "MARK_NO_SHOW": {
      if (actorRole !== "INSTRUCTOR") {
        return {
          ok: false,
          error: "Only the instructor can record a no-show outcome.",
        };
      }
      if (currentStatus !== "APPROVED" && currentStatus !== "CONFIRMED") {
        return {
          ok: false,
          error:
            "Only approved or confirmed appointments can be marked as NO_SHOW.",
        };
      }
      return {
        ok: true,
        nextStatus: "COMPLETED",
        attendanceOutcome: "NO_SHOW",
      };
    }

    default:
      return { ok: false, error: "Unsupported appointment action." };
  }
}

export function validateMeetingTypeSelection(
  requestedMeetingType: unknown,
  availabilityMeetingType?: AvailabilityMeetingType
):
  | { ok: true; value: ConsultationMeetingType }
  | { ok: false; error: string } {
  const normalized = (
    typeof requestedMeetingType === "string"
      ? requestedMeetingType.trim().toUpperCase()
      : ""
  ) as ConsultationMeetingType;

  if (
    !(CONSULTATION_MEETING_TYPES as readonly string[]).includes(normalized)
  ) {
    return {
      ok: false,
      error: "Meeting type must be FACE_TO_FACE or ONLINE.",
    };
  }

  if (
    availabilityMeetingType &&
    availabilityMeetingType !== "BOTH" &&
    availabilityMeetingType !== normalized
  ) {
    return {
      ok: false,
      error: `This time slot only supports ${
        availabilityMeetingType === "FACE_TO_FACE" ? "Face-to-face" : "Online"
      } consultations.`,
    };
  }

  return { ok: true, value: normalized };
}

export {
  ATTENDANCE_OUTCOMES,
  AVAILABILITY_MEETING_TYPES,
  CONSULTATION_MEETING_TYPES,
  CONSULTATION_STATUSES,
  SLOT_DURATIONS,
};

