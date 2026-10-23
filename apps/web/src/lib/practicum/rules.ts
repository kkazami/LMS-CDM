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

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export interface UploadRule {
  extensions: readonly string[];
  maxBytes: number;
}

export const UPLOAD_RULES: Record<SubmissionType, UploadRule> = {
  LESSON_PLAN: { extensions: ["pdf", "docx"], maxBytes: 10 * MB },
  PORTFOLIO_EVIDENCE: { extensions: ["pdf", "png", "jpg", "jpeg"], maxBytes: 10 * MB },
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
  const ext = getExtension(fileName);

  if (!ext || !rule.extensions.includes(ext)) {
    return { ok: false, reason: `Allowed file types: ${rule.extensions.map((e) => e.toUpperCase()).join(", ")}.` };
  }
  if (contentType && !allowedContentTypes(type).includes(contentType.toLowerCase())) {
    return { ok: false, reason: "The file content type is not allowed for this submission type." };
  }
  if (sizeBytes !== undefined && sizeBytes !== null) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return { ok: false, reason: "The file is empty." };
    }
    if (sizeBytes > rule.maxBytes) {
      return { ok: false, reason: `The file is too large. Maximum size is ${rule.maxBytes / MB} MB.` };
    }
  }
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
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
