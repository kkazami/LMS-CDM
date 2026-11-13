/**
 * Pure Practicum rules (no db, no next/*): upload limits, Blob URL checks, video links,
 * submission status transitions and placement access decisions. Everything the API routes
 * enforce is decided here so it can be unit-tested without a database.
 */

import { normalizeRole } from "../admin-types";

// ─── Types ─────────────────────────────────────────────────────────────────

export const SUBMISSION_TYPES = ["LESSON_PLAN", "DEMO_VIDEO", "PORTFOLIO_EVIDENCE"] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export type SubmissionStatus = "SUBMITTED" | "NEEDS_REVISION" | "APPROVED";
export type FeedbackDecision = "COMMENT" | "NEEDS_REVISION" | "APPROVED";

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  LESSON_PLAN: "Lesson Plans",
  DEMO_VIDEO: "Demo Videos",
  PORTFOLIO_EVIDENCE: "Portfolio Evidence",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  SUBMITTED: "Submitted",
  NEEDS_REVISION: "Needs Revision",
  APPROVED: "Approved",
};

// ─── Upload rules ──────────────────────────────────────────────────────────

const MB = 1024 * 1024;

export function getMaxUploadMb(): number {
  const raw = typeof process !== "undefined" ? process.env?.MAX_UPLOAD_MB : undefined;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export const RUBRIC_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx"] as const;
export type RubricExtension = (typeof RUBRIC_EXTENSIONS)[number];

export const RUBRIC_MIME_BY_EXTENSION: Record<RubricExtension, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export interface UploadRule {
  extensions: readonly string[];
  maxBytes: number;
}

export const RUBRIC_MAX_MB = 4;
export const RUBRIC_MAX_BYTES = RUBRIC_MAX_MB * MB;

export const RUBRIC_UPLOAD_RULE: UploadRule = {
  extensions: RUBRIC_EXTENSIONS,
  maxBytes: RUBRIC_MAX_BYTES,
};

export const RUBRIC_HINT_TEXT = `PDF, DOC, DOCX, XLS or XLSX, up to ${RUBRIC_MAX_MB} MB`;

export const UPLOAD_RULES: Record<SubmissionType, UploadRule> = {
  LESSON_PLAN: { extensions: ["pdf", "doc", "docx", "ppt", "pptx"], maxBytes: getMaxUploadMb() * MB },
  PORTFOLIO_EVIDENCE: { extensions: ["pdf", "png", "jpg", "jpeg"], maxBytes: getMaxUploadMb() * MB },
  DEMO_VIDEO: { extensions: ["mp4", "webm", "mov"], maxBytes: 200 * MB },
};

/** Content types a client token may upload for this submission type. */
export function allowedContentTypes(type: SubmissionType): string[] {
  return [...new Set(UPLOAD_RULES[type].extensions.map((ext) => MIME_BY_EXTENSION[ext]))];
}

export function getExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase();
}

export type RuleCheck = { ok: true } | { ok: false; reason: string };

/**
 * Checks a file against the rule for its submission type. `contentType` and `sizeBytes`
 * are optional so the same function covers the pre-upload (name only) and post-upload
 * (server-verified size and type) checks.
 */
export function validateUpload(
  type: SubmissionType,
  fileName: string,
  contentType?: string | null,
  sizeBytes?: number | null
): RuleCheck {
  const rule = UPLOAD_RULES[type];
  const maxBytes = type === "DEMO_VIDEO" ? rule.maxBytes : getMaxUploadMb() * MB;
  const maxMb = Math.round((maxBytes / MB) * 10) / 10;
  const ext = getExtension(fileName);

  if (!ext || !rule.extensions.includes(ext)) {
    return { ok: false, reason: `Allowed file types: ${rule.extensions.map((e) => e.toUpperCase()).join(", ")}.` };
  }
  if (contentType && !allowedContentTypes(type).includes(contentType.toLowerCase())) {
    return { ok: false, reason: `Invalid file type. Allowed types: ${rule.extensions.map((e) => e.toUpperCase()).join(", ")}.` };
  }
  if (sizeBytes !== undefined && sizeBytes !== null) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return { ok: false, reason: "The file is empty." };
    }
    if (sizeBytes > maxBytes) {
      return { ok: false, reason: `File too large (max ${maxMb} MB)` };
    }
  }
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/**
 * Sanitizes a rubric file name for safe storage and Content-Disposition headers.
 * Strips directory paths, control characters, and unsafe symbols while keeping the extension.
 */
export function sanitizeRubricFileName(fileName: string): string {
  const base = (fileName.split(/[\\/]/).pop() ?? "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  const ext = getExtension(base);
  const stemRaw = ext ? base.slice(0, -(ext.length + 1)) : base;
  const cleanStem = stemRaw
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[._\s]+|[._\s]+$/g, "")
    .slice(0, 150);
  const safeStem = cleanStem || "rubric";
  return ext ? `${safeStem}.${ext}` : safeStem;
}

/**
 * Validates a placement rubric file (extension, MIME type, non-empty size <= RUBRIC_MAX_BYTES).
 * Allowed types: PDF, DOC, DOCX, XLS, XLSX.
 */
export function validateRubricUpload(
  fileName: string,
  contentType?: string | null,
  sizeBytes?: number | null
): RuleCheck {
  const allowedLabel = RUBRIC_EXTENSIONS.map((e) => e.toUpperCase()).join(", ");
  const maxMb = Math.round((RUBRIC_MAX_BYTES / MB) * 10) / 10;
  const trimmedName = (fileName ?? "").trim();
  if (!trimmedName) {
    return { ok: false, reason: `Choose a valid rubric file (${allowedLabel}).` };
  }

  const ext = getExtension(trimmedName);
  if (!ext || !(RUBRIC_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, reason: `Invalid file type. Allowed types: ${allowedLabel}.` };
  }

  const expectedMime = RUBRIC_MIME_BY_EXTENSION[ext as RubricExtension];
  if (contentType !== undefined && contentType !== null && contentType.trim() !== "") {
    const normalizedMime = contentType.trim().toLowerCase().split(";")[0];
    if (normalizedMime !== expectedMime) {
      return { ok: false, reason: `Invalid file type. Allowed types: ${allowedLabel}.` };
    }
  }

  if (sizeBytes !== undefined && sizeBytes !== null) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return { ok: false, reason: "The file is empty." };
    }
    if (sizeBytes > RUBRIC_MAX_BYTES) {
      return { ok: false, reason: `File too large (max ${maxMb} MB).` };
    }
  }

  return { ok: true };
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // "%PDF-"
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const; // "PK\x03\x04" (.docx, .xlsx)
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const; // legacy .doc, .xls

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.byteLength < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Verifies that the first bytes of a rubric file match the magic-byte signature
 * required for its extension (.pdf, .docx, .xlsx, .doc, .xls).
 */
export function validateRubricSignature(fileName: string, bytes: Uint8Array): RuleCheck {
  const ext = getExtension(fileName ?? "");
  if (!ext || !(RUBRIC_EXTENSIONS as readonly string[]).includes(ext)) {
    const allowedLabel = RUBRIC_EXTENSIONS.map((e) => e.toUpperCase()).join(", ");
    return { ok: false, reason: `Invalid file type. Allowed types: ${allowedLabel}.` };
  }
  if (!bytes || bytes.byteLength === 0) {
    return { ok: false, reason: "The file is empty." };
  }

  const expectedSignature =
    ext === "pdf"
      ? PDF_SIGNATURE
      : ext === "docx" || ext === "xlsx"
        ? ZIP_SIGNATURE
        : OLE2_SIGNATURE;

  if (!startsWithBytes(bytes, expectedSignature)) {
    return {
      ok: false,
      reason: `The file content does not match its .${ext.toUpperCase()} extension.`,
    };
  }

  return { ok: true };
}

// ─── Blob URL / pathname checks ────────────────────────────────────────────

export function practicumPathPrefix(placementId: string): string {
  return `practicum/${placementId}/`;
}

/** The store id embedded in a read/write token: vercel_blob_rw_<storeId>_<secret>. */
export function getBlobStoreId(token: string | undefined | null): string | null {
  if (!token) return null;
  const match = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token);
  return match ? match[1].toLowerCase() : null;
}

/** A requested upload pathname must live under this placement's folder and have no traversal. */
export function isValidUploadPathname(pathname: string, placementId: string): boolean {
  if (!placementId || /[^A-Za-z0-9_-]/.test(placementId)) return false;
  if (pathname.includes("..") || pathname.includes("\\")) return false;
  return pathname.startsWith(practicumPathPrefix(placementId)) && pathname.length > practicumPathPrefix(placementId).length;
}

/**
 * True only for https URLs on OUR Blob store (host `<storeId>.public.blob.vercel-storage.com`)
 * whose pathname is inside `practicum/<placementId>/`.
 */
export function isOwnBlobUrl(urlString: string, storeId: string | null, placementId: string): boolean {
  if (!storeId) return false;
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (url.hostname.toLowerCase() !== `${storeId.toLowerCase()}.public.blob.vercel-storage.com`) return false;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return false;
  }
  return isValidUploadPathname(pathname, placementId);
}

export function blobPathnameFromUrl(urlString: string): string {
  return decodeURIComponent(new URL(urlString).pathname).replace(/^\/+/, "");
}

// ─── Video links ───────────────────────────────────────────────────────────

export type LinkCheck = { ok: true; url: string } | { ok: false; reason: string };

/** A pasted demo video link must be a plain https URL. */
export function parseVideoLink(raw: string): LinkCheck {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return { ok: false, reason: "Enter a valid video link." };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Enter a valid video link." };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "The video link must start with https://." };
  if (url.username || url.password) return { ok: false, reason: "The video link must not contain credentials." };
  if (!url.hostname.includes(".")) return { ok: false, reason: "Enter a valid video link." };
  return { ok: true, url: url.toString() };
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Privacy-friendly YouTube embed URL for a watch/short/share link, or null for other hosts. */
export function toYouTubeEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") id = parts[1] ?? null;
  }

  return id && YOUTUBE_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

// ─── Status transitions ────────────────────────────────────────────────────

export type TransitionResult = { ok: true; status: SubmissionStatus } | { ok: false; reason: string };

/** A student may resubmit only while the supervisor has asked for a revision. */
export function canResubmit(status: SubmissionStatus): boolean {
  return status === "NEEDS_REVISION";
}

/** A student may delete a lesson plan only while it is SUBMITTED (awaiting review). */
export function canDeleteSubmission(status: SubmissionStatus): boolean {
  return status === "SUBMITTED";
}

export function statusAfterResubmit(current: SubmissionStatus): TransitionResult {
  if (current === "APPROVED") return { ok: false, reason: "Approved submissions cannot be changed." };
  if (current === "SUBMITTED") return { ok: false, reason: "This submission has not been returned for revision." };
  return { ok: true, status: "SUBMITTED" };
}

/**
 * Status after supervisor feedback.
 * SUBMITTED -> NEEDS_REVISION | APPROVED; COMMENT leaves the status alone;
 * NEEDS_REVISION waits for the student's resubmission; APPROVED is final.
 */
export function statusAfterFeedback(current: SubmissionStatus, decision: FeedbackDecision): TransitionResult {
  if (current === "APPROVED") return { ok: false, reason: "Approved submissions cannot be changed." };
  if (decision === "COMMENT") return { ok: true, status: current };
  if (current !== "SUBMITTED") {
    return { ok: false, reason: "This submission is already waiting for the student to revise it." };
  }
  return { ok: true, status: decision };
}

// ─── Access decisions ──────────────────────────────────────────────────────

export type PlacementRole = "student" | "supervisor";

/**
 * How a user relates to a placement: its student, its supervisor (an instructor), or
 * nothing. Admins and everyone else get null.
 */
export function placementRoleFor(
  user: { id: string; role: string },
  placement: { studentId: string; supervisorId: string }
): PlacementRole | null {
  const role = normalizeRole(user.role);
  if (role === "STUDENT" && user.id === placement.studentId) return "student";
  if (role === "INSTRUCTOR" && user.id === placement.supervisorId) return "supervisor";
  return null;
}

export type RubricAccessRole = "supervisor" | "admin" | "student";

/**
 * Who can upload, replace or remove a placement's rubric:
 * - The ITE instructor who owns/supervises the placement (`supervisorId`)
 * - Any ITE admin (`ADMIN`)
 * Everyone else (students, other instructors, non-ITE users) is denied.
 */
export function canManagePlacementRubric(
  user: { id: string; role: string; isIte?: boolean },
  placement: { supervisorId: string }
): boolean {
  if (user.isIte === false) return false;
  if (!user.id) return false;
  const role = normalizeRole(user.role);
  if (role === "ADMIN") return true;
  if (role === "INSTRUCTOR" && user.id === placement.supervisorId) return true;
  return false;
}

/**
 * Determines how a user may view/download a placement's rubric:
 * - The instructor who owns the placement (`supervisor`)
 * - ITE admins (`admin`)
 * - The student teacher assigned to that placement (`student`)
 * Everyone else gets null (403 Forbidden).
 */
export function placementRubricAccessFor(
  user: { id: string; role: string; isIte?: boolean },
  placement: { studentId: string; supervisorId: string }
): RubricAccessRole | null {
  if (user.isIte === false) return null;
  if (!user.id) return null;
  const role = normalizeRole(user.role);
  if (role === "ADMIN") return "admin";
  if (role === "INSTRUCTOR" && user.id === placement.supervisorId) return "supervisor";
  if (role === "STUDENT" && user.id === placement.studentId) return "student";
  return null;
}

export function canViewPlacementRubric(
  user: { id: string; role: string; isIte?: boolean },
  placement: { studentId: string; supervisorId: string }
): boolean {
  return placementRubricAccessFor(user, placement) !== null;
}

// ─── Progress summaries ────────────────────────────────────────────────────

export interface TypeSummary {
  total: number;
  approved: number;
  pendingReview: number;
  needsRevision: number;
}

export type PlacementSummary = Record<SubmissionType, TypeSummary>;

export function emptySummary(): PlacementSummary {
  return {
    LESSON_PLAN: { total: 0, approved: 0, pendingReview: 0, needsRevision: 0 },
    DEMO_VIDEO: { total: 0, approved: 0, pendingReview: 0, needsRevision: 0 },
    PORTFOLIO_EVIDENCE: { total: 0, approved: 0, pendingReview: 0, needsRevision: 0 },
  };
}

/** Builds per-type counts from `groupBy(type, status)` rows. */
export function summarizeGroups(
  groups: { type: SubmissionType; status: SubmissionStatus; count: number }[]
): PlacementSummary {
  const summary = emptySummary();
  for (const g of groups) {
    const bucket = summary[g.type];
    bucket.total += g.count;
    if (g.status === "APPROVED") bucket.approved += g.count;
    else if (g.status === "SUBMITTED") bucket.pendingReview += g.count;
    else bucket.needsRevision += g.count;
  }
  return summary;
}

export function totalPendingReview(summary: PlacementSummary): number {
  return SUBMISSION_TYPES.reduce((sum, t) => sum + summary[t].pendingReview, 0);
}
