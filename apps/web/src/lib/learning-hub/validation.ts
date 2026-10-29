import { getCourseById } from "./catalog";
import type {
  LearningRecordInput,
  LearningRecordStatus,
  StudentLearningRecord,
} from "./types";

export const LEARNING_RECORD_ID = /^c[a-z0-9]{20,36}$/i;

const VALID_STATUSES: readonly LearningRecordStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
];

/**
 * Validates that an external URL uses safe web schemes (https: or http:),
 * contains no embedded credentials, and does not point to loopback/private hosts
 * or executable schemes (javascript:, data:, file:, vbscript:).
 */
export function validateSafeExternalUrl(
  rawUrl: unknown,
  options: { requireHttps?: boolean } = {}
): { ok: true; url: string } | { ok: false; error: string } {
  if (typeof rawUrl !== "string") {
    return { ok: false, error: "URL must be a string." };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: true, url: "" };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: "URL must not exceed 2,048 characters." };
  }
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return { ok: false, error: "URL contains invalid control characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Please enter a valid web URL starting with https://." };
  }

  const allowedProtocols = options.requireHttps ? ["https:"] : ["https:", "http:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      ok: false,
      error: options.requireHttps
        ? "Only secure https:// web links are allowed."
        : "Only https:// or http:// web links are allowed.",
    };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return { ok: false, error: "Private or local network URLs are not permitted." };
  }

  if (!host.includes(".")) {
    return { ok: false, error: "Please enter a valid public domain URL." };
  }

  return { ok: true, url: parsed.toString() };
}

export interface ValidatedLearningRecordMutation {
  courseId: string;
  status: LearningRecordStatus;
  completedAt: Date | null;
  certificateUrl: string;
  notes: string;
  markOpened: boolean;
}

export function validateLearningRecordInput(
  body: unknown,
  existing?: {
    courseId: string;
    status: string;
    completedAt: Date | null;
    certificateUrl: string;
    notes: string;
  }
): { ok: true; data: ValidatedLearningRecordMutation } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const raw = body as Record<string, unknown>;
  const courseId =
    typeof raw.courseId === "string" && raw.courseId.trim()
      ? raw.courseId.trim()
      : existing?.courseId ?? "";

  if (!courseId || !getCourseById(courseId)) {
    return {
      ok: false,
      message: "Invalid or unrecognized IBE Learning Hub course ID.",
    };
  }

  const rawStatus =
    typeof raw.status === "string"
      ? (raw.status.trim().toUpperCase() as LearningRecordStatus)
      : ((existing?.status ?? "PLANNED") as LearningRecordStatus);

  if (!VALID_STATUSES.includes(rawStatus)) {
    return {
      ok: false,
      message: "Status must be PLANNED, IN_PROGRESS, or COMPLETED.",
    };
  }

  // Validate certificate URL if provided
  const rawCertUrl =
    raw.certificateUrl !== undefined
      ? raw.certificateUrl
      : existing?.certificateUrl ?? "";
  const certCheck = validateSafeExternalUrl(rawCertUrl);
  if (!certCheck.ok) {
    return { ok: false, message: `Certificate link error: ${certCheck.error}` };
  }

  // Validate completion date
  let completedAt: Date | null = null;
  if (rawStatus === "COMPLETED") {
    if (typeof raw.completedAt === "string" && raw.completedAt.trim()) {
      const parsedDate = new Date(raw.completedAt.trim());
      if (Number.isNaN(parsedDate.getTime())) {
        return { ok: false, message: "Invalid completion date format." };
      }
      const maxFuture = Date.now() + 48 * 60 * 60 * 1000;
      if (parsedDate.getTime() > maxFuture) {
        return { ok: false, message: "Completion date cannot be in the future." };
      }
      completedAt = parsedDate;
    } else if (existing?.completedAt) {
      completedAt = existing.completedAt;
    } else {
      completedAt = new Date();
    }
  } else if (raw.completedAt === null) {
    completedAt = null;
  }

  const rawNotes =
    typeof raw.notes === "string"
      ? raw.notes.trim().slice(0, 1000)
      : existing?.notes ?? "";

  const markOpened = raw.markOpened === true;

  return {
    ok: true,
    data: {
      courseId,
      status: rawStatus,
      completedAt,
      certificateUrl: certCheck.url,
      notes: rawNotes,
      markOpened,
    },
  };
}

export interface RawIbeLearningRecordRow {
  id: string;
  studentId: string;
  instituteId: string;
  courseId: string;
  status: string;
  completedAt: Date | null;
  certificateUrl: string;
  notes: string;
  verificationType: string;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toStudentLearningRecord(
  row: RawIbeLearningRecordRow
): StudentLearningRecord {
  const status: LearningRecordStatus = VALID_STATUSES.includes(
    row.status as LearningRecordStatus
  )
    ? (row.status as LearningRecordStatus)
    : "PLANNED";

  return {
    id: row.id,
    studentId: row.studentId,
    instituteId: row.instituteId,
    courseId: row.courseId,
    status,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    certificateUrl: row.certificateUrl || "",
    notes: row.notes || "",
    verificationType: "SELF_REPORTED",
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

