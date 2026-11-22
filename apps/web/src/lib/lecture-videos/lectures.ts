import { ITE_STUDENT_PROGRAM_CODES, type IteStudentProgramCode } from "@/lib/ite-programs/features";

export const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export const LECTURE_SOURCE_TYPES = ["UPLOAD", "YOUTUBE", "DRIVE"] as const;
export type LectureSourceType = (typeof LECTURE_SOURCE_TYPES)[number];
export type LectureSourceLabel = "Uploaded" | "YouTube" | "Google Drive";

export const LECTURE_SOURCE_LABELS: Record<
  LectureSourceType,
  LectureSourceLabel
> = {
  UPLOAD: "Uploaded",
  YOUTUBE: "YouTube",
  DRIVE: "Google Drive",
};

export const DRIVE_SHARING_NOTE =
  "Set the file's sharing to 'Anyone with the link' so students can watch it.";

export const DRIVE_NOT_TRACKED_NOTE =
  "Google Drive embeds do not expose playback events across origins, so viewing progress is not tracked for Google Drive lectures and is excluded from completion counts.";

export const LECTURE_ALLOWED_EXTENSIONS = ["mp4", "webm"] as const;
export type LectureFileExtension = (typeof LECTURE_ALLOWED_EXTENSIONS)[number];

export const LECTURE_MIME_BY_EXTENSION: Record<LectureFileExtension, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

export const LECTURE_ALLOWED_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export const LECTURE_ACCEPT_ATTRIBUTE = ".mp4,.webm,video/mp4,video/webm";

export const LECTURE_MAX_MB = 300;
export const LECTURE_MAX_BYTES = LECTURE_MAX_MB * 1024 * 1024;
export const LECTURE_HINT_TEXT = `MP4 or WebM, up to ${LECTURE_MAX_MB} MB`;
export const LECTURE_UPLOADS_UNAVAILABLE_MESSAGE =
  "Video uploads aren\u2019t available right now. Please contact your administrator.";

export const LECTURE_MAX_TITLE_LENGTH = 140;
export const LECTURE_MAX_DESCRIPTION_LENGTH = 1000;

export const LECTURE_COMPLETION_THRESHOLD = 0.9; // 90%
export const LECTURE_MAX_STEP_SECONDS = 2.5; // Ignore jumps > ~2.5s between updates (treated as seeks)
export const LECTURE_SAVE_INTERVAL_MS = 10_000; // Save at most every ~10s while playing
export const LECTURE_DURATION_TOLERANCE_SECONDS = 5;

export const APPROVED_ENROLLMENT_STATUS = "APPROVED";

export type LectureWatchStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_TRACKED";

export interface IteCourseSummary {
  id: string;
  code: string;
  title: string;
  section: string;
  displayLabel: string;
}

export function formatCourseSubjectLabel(course: {
  code: string;
  title: string;
  section?: string | null;
}): string {
  const code = (course.code ?? "").trim();
  const title = (course.title ?? "").trim();
  const section = (course.section ?? "").trim();
  const base = code && title ? `${code} — ${title}` : code || title || "Course";
  return section ? `${base} (${section})` : base;
}

export interface StudentLectureProgressSummary {
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  percentWatched: number;
  completedAt: string | null;
  lastWatchedAt: string | null;
  status: Exclude<LectureWatchStatus, "NOT_TRACKED">;
}

export interface IteLectureVideoDTO {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseSection: string;
  courseLabel: string;
  sourceType: LectureSourceType;
  sourceLabel: LectureSourceLabel;
  externalVideoId: string | null;
  externalUrl: string | null;
  embedUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  durationSeconds: number;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  streamUrl: string | null;
  isProgressTracked: boolean;
  canManage: boolean;
  canViewProgress: boolean;
  myProgress: StudentLectureProgressSummary | null;
}

export interface IteStudentIdentity {
  id: string;
  name: string;
  email?: string;
  studentNumber?: string | null;
  programCode?: IteStudentProgramCode | null;
  section?: string | null;
  enrollmentStatus?: string | null;
}

export interface FacultyLectureProgressRow {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentNumber: string | null;
  programCode: IteStudentProgramCode | null;
  programLabel: string;
  section: string | null;
  watchedSeconds: number;
  lastPositionSeconds: number;
  durationSeconds: number;
  percentWatched: number;
  status: LectureWatchStatus;
  statusLabel: "Not started" | "In progress" | "Completed" | "Not tracked";
  completedAt: string | null;
  lastWatchedAt: string | null;
}

export interface FacultyLectureProgressSummaryCounts {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

export interface FacultyLectureProgressReport {
  lectureId: string;
  lectureTitle: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseSection: string;
  courseLabel: string;
  lectureSourceType: LectureSourceType;
  lectureSourceLabel: LectureSourceLabel;
  lectureDurationSeconds: number;
  isProgressTracked: boolean;
  trackingNote: string | null;
  availablePrograms: readonly IteStudentProgramCode[];
  summary: FacultyLectureProgressSummaryCounts;
  rows: FacultyLectureProgressRow[];
}

// ─── MP4 & WebM Binary Signature (Magic-Byte) Verification ───────────────────

const MP4_FTYP_BYTES = [0x66, 0x74, 0x79, 0x70] as const; // "ftyp" at offset 4..7
const WEBM_EBML_BYTES = [0x1a, 0x45, 0xdf, 0xa3] as const; // EBML header at offset 0..3

export function getLectureFileExtension(fileName: string): string {
  const trimmed = (fileName ?? "").trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot < 0 || dot === trimmed.length - 1) return "";
  return trimmed.slice(dot + 1).toLowerCase();
}

export function hasValidVideoSignature(
  ext: LectureFileExtension,
  headerBytes: Uint8Array
): boolean {
  if (ext === "mp4") {
    if (headerBytes.length < 8) return false;
    return MP4_FTYP_BYTES.every((b, idx) => headerBytes[4 + idx] === b);
  }
  if (ext === "webm") {
    if (headerBytes.length < 4) return false;
    return WEBM_EBML_BYTES.every((b, idx) => headerBytes[idx] === b);
  }
  return false;
}

export function validateLectureSignature(
  fileName: string,
  headerBytes: Uint8Array
): { ok: boolean; reason?: string } {
  const ext = getLectureFileExtension(fileName);
  if (
    !(LECTURE_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return {
      ok: false,
      reason: `Unsupported file type. Allowed formats: MP4, WebM (up to ${LECTURE_MAX_MB} MB).`,
    };
  }
  if (!hasValidVideoSignature(ext as LectureFileExtension, headerBytes)) {
    return {
      ok: false,
      reason:
        "The uploaded file's binary content does not match a valid MP4 or WebM video signature.",
    };
  }
  return { ok: true };
}

export function validateLectureUpload(
  fileName: string,
  mimeType?: string | null,
  fileSize?: number | null
): { ok: boolean; reason?: string } {
  const ext = getLectureFileExtension(fileName);
  if (
    !ext ||
    !(LECTURE_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return {
      ok: false,
      reason: `Unsupported file type. Allowed formats: MP4, WebM (up to ${LECTURE_MAX_MB} MB).`,
    };
  }

  if (mimeType !== undefined && mimeType !== null && mimeType !== "") {
    const cleanMime = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
    const expectedMime = LECTURE_MIME_BY_EXTENSION[ext as LectureFileExtension];
    if (
      !(LECTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(cleanMime) ||
      cleanMime !== expectedMime
    ) {
      return {
        ok: false,
        reason: `File MIME type (${cleanMime || "unknown"}) does not match the .${ext} video extension.`,
      };
    }
  }

  if (fileSize !== undefined && fileSize !== null) {
    if (
      typeof fileSize !== "number" ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return {
        ok: false,
        reason: "The selected video file is empty.",
      };
    }
    if (fileSize > LECTURE_MAX_BYTES) {
      return {
        ok: false,
        reason: `Video file exceeds the ${LECTURE_MAX_MB} MB size limit.`,
      };
    }
  }

  return { ok: true };
}

// ─── YouTube & Google Drive Link Parsing and ID-Only Embed Builders ──────────

const LECTURE_ALLOWED_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const LECTURE_ALLOWED_DRIVE_HOSTS = new Set(["drive.google.com"]);

/**
 * Google Drive file IDs are alphanumeric with `-` and `_`, typically 25–44 chars (minimum 10 chars).
 */
export const GOOGLE_DRIVE_FILE_ID_REGEX = /^[A-Za-z0-9_-]{10,120}$/;

export function isValidYouTubeLectureId(id: unknown): id is string {
  return typeof id === "string" && YOUTUBE_VIDEO_ID_REGEX.test(id);
}

export function isValidGoogleDriveFileId(id: unknown): id is string {
  return typeof id === "string" && GOOGLE_DRIVE_FILE_ID_REGEX.test(id);
}

/**
 * Builds the privacy-enhanced YouTube embed URL strictly from a validated 11-char video ID.
 * Never embeds a raw user-provided URL.
 * Includes `enablejsapi=1` so the YouTube IFrame Player API postMessage bridge can report playback state.
 */
export function buildYouTubeLectureEmbedUrl(videoId: string): string {
  if (!isValidYouTubeLectureId(videoId)) {
    throw new Error("Invalid YouTube video ID.");
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1`;
}

/**
 * Builds the Google Drive preview embed URL strictly from a validated Drive file ID.
 * Never embeds a raw user-provided URL.
 */
export function buildGoogleDriveLectureEmbedUrl(fileId: string): string {
  if (!isValidGoogleDriveFileId(fileId)) {
    throw new Error("Invalid Google Drive file ID.");
  }
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export type ExternalLectureLinkResult =
  | {
      ok: true;
      sourceType: "YOUTUBE" | "DRIVE";
      videoId: string;
      embedUrl: string;
      canonicalUrl: string;
    }
  | {
      ok: false;
      reason: string;
    };

function parseStrictHttpsUrl(
  rawUrl: unknown
): { ok: true; url: URL } | { ok: false; reason: string } {
  if (typeof rawUrl !== "string") {
    return { ok: false, reason: "Please enter a valid https:// video link." };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, reason: "Please enter a video link." };
  }
  if (trimmed.length > 2048) {
    return { ok: false, reason: "URL is too long." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: "Invalid URL format. Please enter a complete https:// link.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "Only https:// video links are allowed.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      reason: "Invalid URL host: embedded credentials are not allowed.",
    };
  }

  if (parsed.port && parsed.port !== "443") {
    return {
      ok: false,
      reason: "Non-standard URL ports are not allowed.",
    };
  }

  return { ok: true, url: parsed };
}

/**
 * Strictly validates a YouTube lecture link (https only):
 * - Allowed hosts: youtube.com, www.youtube.com, m.youtube.com, youtu.be, www.youtu.be, youtube-nocookie.com, www.youtube-nocookie.com
 * - Accepted forms:
 *   - youtube.com/watch?v=<11-char ID> (rejects if `list=` playlist param is present)
 *   - youtu.be/<11-char ID> (rejects if `list=` playlist param is present)
 *   - youtube.com/embed/<11-char ID> (rejects `/embed/videoseries` and any `list=`)
 *   - youtube.com/shorts/<11-char ID>
 * - Rejects playlists, channels, user pages, search results, http:// links, and look-alike hosts.
 */
export function parseYouTubeLectureUrl(
  rawUrl: unknown
): ExternalLectureLinkResult {
  const parsedRes = parseStrictHttpsUrl(rawUrl);
  if (!parsedRes.ok) return parsedRes;
  const { url } = parsedRes;

  const host = url.hostname.toLowerCase();
  if (!LECTURE_ALLOWED_YOUTUBE_HOSTS.has(host)) {
    return {
      ok: false,
      reason: "URL must be from youtube.com or youtu.be.",
    };
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const searchParams = url.searchParams;

  if (
    pathname === "/playlist" ||
    pathname.startsWith("/playlist/") ||
    searchParams.has("list")
  ) {
    return {
      ok: false,
      reason:
        "YouTube playlists are not supported for lectures. Please paste a single YouTube video link.",
    };
  }

  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/channel/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/user/") ||
    pathname === "/results"
  ) {
    return {
      ok: false,
      reason:
        "YouTube channel and search links are not supported. Please paste a direct video link.",
    };
  }

  let candidateId = "";

  if (host === "youtu.be" || host === "www.youtu.be") {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 1) {
      return {
        ok: false,
        reason: "Invalid youtu.be video link.",
      };
    }
    candidateId = segments[0];
  } else if (pathname === "/watch") {
    candidateId = (searchParams.get("v") ?? "").trim();
  } else {
    const match = /^\/(embed|shorts)\/([^/?#]+)$/.exec(pathname);
    if (match) {
      candidateId = match[2].trim();
    } else {
      return {
        ok: false,
        reason:
          "Unsupported YouTube URL path. Use youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, or youtube.com/shorts/ID.",
      };
    }
  }

  if (!YOUTUBE_VIDEO_ID_REGEX.test(candidateId)) {
    return {
      ok: false,
      reason:
        "YouTube video ID must be exactly 11 characters ([A-Za-z0-9_-]).",
    };
  }

  return {
    ok: true,
    sourceType: "YOUTUBE",
    videoId: candidateId,
    embedUrl: buildYouTubeLectureEmbedUrl(candidateId),
    canonicalUrl: `https://www.youtube.com/watch?v=${candidateId}`,
  };
}

/**
 * Strictly validates a Google Drive lecture video link (https only):
 * - Allowed host (exact match): drive.google.com
 *   (Rejects docs.google.com, look-alikes like drive.google.com.evil.com, google.com@evil.com, etc.)
 * - Accepted forms:
 *   - https://drive.google.com/file/d/<ID>/view (or /preview, or bare /file/d/<ID>)
 *   - https://drive.google.com/open?id=<ID>
 *   - https://drive.google.com/uc?id=<ID>
 * - Rejects folders (/drive/folders/...), Google Docs/Sheets/Slides links, and non-Google hosts.
 */
export function parseGoogleDriveLectureUrl(
  rawUrl: unknown
): ExternalLectureLinkResult {
  const parsedRes = parseStrictHttpsUrl(rawUrl);
  if (!parsedRes.ok) return parsedRes;
  const { url } = parsedRes;

  const host = url.hostname.toLowerCase();
  if (host === "docs.google.com") {
    return {
      ok: false,
      reason:
        "Google Docs, Sheets, and Slides links are not supported. Please paste a Google Drive video file link (drive.google.com).",
    };
  }
  if (!LECTURE_ALLOWED_DRIVE_HOSTS.has(host)) {
    return {
      ok: false,
      reason: "URL host must be exactly drive.google.com.",
    };
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const searchParams = url.searchParams;

  if (
    pathname.includes("/folders") ||
    pathname.startsWith("/drive/") ||
    pathname === "/drive"
  ) {
    return {
      ok: false,
      reason:
        "Google Drive folder links are not supported. Please paste a link to a single video file.",
    };
  }

  if (
    pathname.startsWith("/document/") ||
    pathname.startsWith("/spreadsheets/") ||
    pathname.startsWith("/presentation/") ||
    pathname.startsWith("/forms/")
  ) {
    return {
      ok: false,
      reason:
        "Google Docs, Sheets, Slides, and Forms links are not supported. Please paste a Google Drive video file link.",
    };
  }

  let candidateId = "";

  if (pathname.startsWith("/file/d/")) {
    const rest = pathname.slice("/file/d/".length);
    const segments = rest.split("/").filter(Boolean);
    if (segments.length === 0 || segments.length > 2) {
      return {
        ok: false,
        reason:
          "Invalid Google Drive file link. Use drive.google.com/file/d/ID/view or /preview.",
      };
    }
    if (
      segments.length === 2 &&
      segments[1] !== "view" &&
      segments[1] !== "preview"
    ) {
      return {
        ok: false,
        reason:
          "Invalid Google Drive file link action. Use /file/d/ID/view or /file/d/ID/preview.",
      };
    }
    candidateId = segments[0].trim();
  } else if (pathname === "/open" || pathname === "/uc") {
    candidateId = (searchParams.get("id") ?? "").trim();
    if (!candidateId) {
      return {
        ok: false,
        reason: "Google Drive link is missing the file id parameter.",
      };
    }
  } else {
    return {
      ok: false,
      reason:
        "Unsupported Google Drive URL path. Use drive.google.com/file/d/ID/view, /preview, /open?id=ID, or /uc?id=ID.",
    };
  }

  if (!GOOGLE_DRIVE_FILE_ID_REGEX.test(candidateId)) {
    return {
      ok: false,
      reason: "Invalid Google Drive file ID.",
    };
  }

  return {
    ok: true,
    sourceType: "DRIVE",
    videoId: candidateId,
    embedUrl: buildGoogleDriveLectureEmbedUrl(candidateId),
    canonicalUrl: `https://drive.google.com/file/d/${candidateId}/view`,
  };
}

export function parseExternalLectureUrl(
  sourceType: "YOUTUBE" | "DRIVE",
  rawUrl: unknown
): ExternalLectureLinkResult {
  if (sourceType === "YOUTUBE") {
    return parseYouTubeLectureUrl(rawUrl);
  }
  return parseGoogleDriveLectureUrl(rawUrl);
}

// ─── Metadata & Subject (courseId) Validation ────────────────────────────────

function stripControlChars(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function validateLectureMetadata(input: {
  title: unknown;
  description?: unknown;
  courseId: unknown;
}):
  | {
      ok: true;
      title: string;
      description: string | null;
      courseId: string;
    }
  | { ok: false; reason: string } {
  const rawTitle =
    typeof input.title === "string"
      ? stripControlChars(input.title).trim()
      : "";
  if (!rawTitle) {
    return { ok: false, reason: "Lecture title is required." };
  }
  if (rawTitle.length > LECTURE_MAX_TITLE_LENGTH) {
    return {
      ok: false,
      reason: `Lecture title must be ${LECTURE_MAX_TITLE_LENGTH} characters or fewer.`,
    };
  }

  let description: string | null = null;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      return { ok: false, reason: "Invalid lecture description." };
    }
    const cleaned = stripControlChars(input.description).trim();
    if (cleaned.length > LECTURE_MAX_DESCRIPTION_LENGTH) {
      return {
        ok: false,
        reason: `Description must be ${LECTURE_MAX_DESCRIPTION_LENGTH} characters or fewer.`,
      };
    }
    description = cleaned.length > 0 ? cleaned : null;
  }

  const rawCourseId =
    typeof input.courseId === "string"
      ? stripControlChars(input.courseId).trim()
      : "";
  if (!rawCourseId) {
    return {
      ok: false,
      reason: "Please select a subject for this lecture.",
    };
  }

  return {
    ok: true,
    title: rawTitle,
    description,
    courseId: rawCourseId,
  };
}

// ─── Vercel Blob Pathname & Ownership Validation ─────────────────────────────

export const LECTURE_BLOB_PREFIX = "ite/lecture-videos/";

export function sanitizeLectureFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.{2,}/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^[._-]+/, "")
      .slice(0, 80) || "lecture.mp4"
  );
}

export function buildLectureBlobPathname(
  uploaderId: string,
  fileName: string
): string {
  const safeUser = uploaderId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${LECTURE_BLOB_PREFIX}${safeUser}/${sanitizeLectureFilename(fileName)}`;
}

export function isValidLectureUploadPathname(
  pathname: string,
  uploaderId: string
): boolean {
  const safeUser = uploaderId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeUser) return false;
  const expectedPrefix = `${LECTURE_BLOB_PREFIX}${safeUser}/`;
  if (!pathname.startsWith(expectedPrefix)) return false;
  if (pathname.includes("..") || pathname.includes("\\")) return false;
  const rest = pathname.slice(expectedPrefix.length);
  if (!rest || rest.includes("/")) return false;
  return validateLectureUpload(rest).ok;
}

export function getLectureBlobStoreId(
  readWriteToken = process.env.BLOB_READ_WRITE_TOKEN
): string | null {
  const match = /^vercel_blob_rw_([a-z\d]+)_/i.exec(readWriteToken ?? "");
  return match?.[1]?.toLowerCase() ?? null;
}

export function isOwnLectureBlobUrl(
  rawUrl: string,
  storeId: string | null,
  uploaderId: string
): boolean {
  if (!storeId) return false;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const expectedHost = `${storeId}.public.blob.vercel-storage.com`;
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== expectedHost
  ) {
    return false;
  }
  const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  return isValidLectureUploadPathname(pathname, uploaderId);
}

export function lectureBlobPathnameFromUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  return decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
}

// ─── Role, Course Enrollment & Subject-Based Visibility Rules ────────────────

export type LectureActorRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export function normalizeActorRole(rawRole?: string | null): LectureActorRole | null {
  const upper = (rawRole ?? "").trim().toUpperCase();
  if (upper === "STUDENT") return "STUDENT";
  if (upper === "INSTRUCTOR" || upper === "PROFESSOR" || upper === "TEACHER") {
    return "INSTRUCTOR";
  }
  if (upper === "ADMIN") return "ADMIN";
  return null;
}

export interface CourseEnrollmentCheckRecord {
  studentId: string;
  status?: string | null;
}

export interface LectureCourseAccessSnapshot {
  id: string;
  instructorId?: string | null;
  instructorIds?: readonly string[] | null;
  isArchived?: boolean;
  instituteCode?: string | null;
  enrollments?: readonly CourseEnrollmentCheckRecord[] | null;
}

export interface LectureCourseAccessTarget {
  courseId?: string;
  isActive?: boolean;
  uploadedById: string;
  course: LectureCourseAccessSnapshot;
}

/**
 * Reuses the app's existing enrollment rule (`status === "APPROVED"` in `course-access.ts`,
 * `student-access.ts`, and `ite/meetings/guard.ts`):
 * - Only `APPROVED` enrollments grant course access.
 * - `PENDING`, `DROPPED`, `REJECTED`, `DECLINED`, or missing enrollments do NOT count as enrolled.
 */
export function isApprovedCourseEnrollment(
  enrollment: { status?: string | null } | string | null | undefined
): boolean {
  if (!enrollment) return false;
  const status =
    typeof enrollment === "string" ? enrollment : enrollment.status;
  return (status ?? "").trim().toUpperCase() === APPROVED_ENROLLMENT_STATUS;
}

/**
 * Reuses the app's existing course-instructor rule (`course.instructorId === userId` in
 * `course-access.ts` and `ite/meetings/guard.ts`), and also supports co-instructors if
 * `instructorIds` is present on a course snapshot.
 */
export function doesInstructorTeachCourse(
  userId: string,
  course: LectureCourseAccessSnapshot | null | undefined
): boolean {
  if (!userId || !course) return false;
  if (course.isArchived) return false;
  if (
    course.instituteCode !== undefined &&
    course.instituteCode !== null &&
    course.instituteCode.toLowerCase() !== "ite"
  ) {
    return false;
  }
  if (course.instructorId === userId) return true;
  if (
    Array.isArray(course.instructorIds) &&
    course.instructorIds.includes(userId)
  ) {
    return true;
  }
  return false;
}

export function isActiveIteCourseSnapshot(
  course: LectureCourseAccessSnapshot | null | undefined
): boolean {
  if (!course || !course.id) return false;
  if (course.isArchived) return false;
  if (
    course.instituteCode !== undefined &&
    course.instituteCode !== null &&
    course.instituteCode.toLowerCase() !== "ite"
  ) {
    return false;
  }
  return true;
}

export function canUploadLecture(actor: {
  role?: string | null;
  instituteCode?: string | null;
}): boolean {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") return false;
  const role = normalizeActorRole(actor.role);
  return role === "INSTRUCTOR" || role === "ADMIN";
}

/**
 * Determines whether the actor can attach or move a lecture to the specified course:
 * - Actor must belong to ITE and be an INSTRUCTOR or ADMIN.
 * - Course must be an active (unarchived) ITE course.
 * - INSTRUCTOR can only choose a course they teach.
 * - ADMIN may choose any active ITE course.
 */
export function canActorAssignLectureToCourse(
  actor: {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  },
  course: LectureCourseAccessSnapshot | null | undefined
): { ok: true } | { ok: false; status: 403 | 404; reason: string } {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") {
    return {
      ok: false,
      status: 403,
      reason: "Recorded lectures are only available in the ITE institute.",
    };
  }
  const role = normalizeActorRole(actor.role);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    return {
      ok: false,
      status: 403,
      reason: "Only ITE faculty and administrators can add or edit lectures.",
    };
  }
  if (!isActiveIteCourseSnapshot(course)) {
    return {
      ok: false,
      status: 404,
      reason: "Selected subject was not found in ITE.",
    };
  }
  if (role === "ADMIN") {
    return { ok: true };
  }
  if (!doesInstructorTeachCourse(actor.userId, course)) {
    return {
      ok: false,
      status: 403,
      reason: "You can only assign lectures to ITE courses you teach.",
    };
  }
  return { ok: true };
}

/**
 * Determines whether the actor can see or play a lecture:
 * - Student: only if they have an APPROVED enrollment in the lecture's course.
 * - Instructor: only if they teach the lecture's course (whether they uploaded it or another instructor of the same course did).
 * - Admin: sees all ITE lectures.
 */
export function canActorViewLecture(
  actor: {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  },
  context: {
    course: LectureCourseAccessSnapshot | null | undefined;
    isActive?: boolean;
    enrollmentStatus?: string | null;
    enrolledCourseIds?: ReadonlySet<string> | readonly string[];
  }
): boolean {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") return false;
  if (!actor.userId) return false;
  if (context.isActive === false) return false;
  const { course } = context;
  if (!isActiveIteCourseSnapshot(course) || !course) return false;

  const role = normalizeActorRole(actor.role);
  if (role === "ADMIN") return true;
  if (role === "INSTRUCTOR") {
    return doesInstructorTeachCourse(actor.userId, course);
  }
  if (role === "STUDENT") {
    if (context.enrollmentStatus !== undefined) {
      return isApprovedCourseEnrollment(context.enrollmentStatus);
    }
    if (context.enrolledCourseIds) {
      if (Array.isArray(context.enrolledCourseIds)) {
        return context.enrolledCourseIds.includes(course.id);
      }
      return (context.enrolledCourseIds as ReadonlySet<string>).has(course.id);
    }
    if (Array.isArray(course.enrollments)) {
      return course.enrollments.some(
        (enrollment) =>
          enrollment.studentId === actor.userId &&
          isApprovedCourseEnrollment(enrollment)
      );
    }
    return false;
  }
  return false;
}

/**
 * Determines whether the actor can view the student progress table for a lecture:
 * - Admin: can view progress for any ITE lecture.
 * - Instructor: can view progress for any lecture belonging to a course they teach
 *   (including lectures uploaded by a co-instructor of the same course).
 * - Student: never.
 */
export function canActorViewLectureProgress(
  actor: {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  },
  courseOrTarget:
    | LectureCourseAccessSnapshot
    | { course: LectureCourseAccessSnapshot | null | undefined; isActive?: boolean }
    | null
    | undefined
): boolean {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") return false;
  if (!actor.userId) return false;
  if (!courseOrTarget) return false;

  const isTargetWrapper =
    typeof courseOrTarget === "object" &&
    "course" in courseOrTarget &&
    courseOrTarget.course !== undefined;

  if (
    isTargetWrapper &&
    (courseOrTarget as { isActive?: boolean }).isActive === false
  ) {
    return false;
  }

  const course = isTargetWrapper
    ? (courseOrTarget as { course: LectureCourseAccessSnapshot | null | undefined })
        .course
    : (courseOrTarget as LectureCourseAccessSnapshot);

  if (!isActiveIteCourseSnapshot(course)) return false;

  const role = normalizeActorRole(actor.role);
  if (role === "ADMIN") return true;
  if (role === "INSTRUCTOR") {
    return doesInstructorTeachCourse(actor.userId, course);
  }
  return false;
}

/**
 * Determines whether the actor can edit or delete a lecture:
 * - Admin: can edit or delete any ITE lecture.
 * - Instructor: ONLY the uploader (`uploadedById === actor.userId`) who teaches the course can edit or delete.
 *   Other instructors of the same course can view the lecture and its progress table, but CANNOT edit or delete it.
 * - Student: never.
 */
export function canManageLecture(
  actor: {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  },
  lecture: {
    uploadedById: string;
    course?: LectureCourseAccessSnapshot | null;
  }
): boolean {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") return false;
  const role = normalizeActorRole(actor.role);
  if (role === "ADMIN") {
    return lecture.course ? isActiveIteCourseSnapshot(lecture.course) : true;
  }
  if (role === "INSTRUCTOR") {
    if (!actor.userId || actor.userId !== lecture.uploadedById) {
      return false;
    }
    if (lecture.course) {
      return doesInstructorTeachCourse(actor.userId, lecture.course);
    }
    return true;
  }
  return false;
}

export function canViewLectureProgressTable(actor: {
  role?: string | null;
  instituteCode?: string | null;
}): boolean {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") return false;
  const role = normalizeActorRole(actor.role);
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export function canWriteStudentLectureProgress(
  actor: {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  },
  targetStudentId?: string | null
): { ok: true; studentId: string } | { ok: false; status: 403; reason: string } {
  if ((actor.instituteCode ?? "").toLowerCase() !== "ite") {
    return {
      ok: false,
      status: 403,
      reason: "This feature is only available to ITE users.",
    };
  }
  const role = normalizeActorRole(actor.role);
  if (role !== "STUDENT") {
    return {
      ok: false,
      status: 403,
      reason: "Only ITE students can record lecture viewing progress.",
    };
  }
  if (!actor.userId) {
    return {
      ok: false,
      status: 403,
      reason: "Invalid student session.",
    };
  }
  if (
    targetStudentId !== undefined &&
    targetStudentId !== null &&
    targetStudentId !== actor.userId
  ) {
    return {
      ok: false,
      status: 403,
      reason: "Students cannot write another student's viewing progress.",
    };
  }
  return { ok: true, studentId: actor.userId };
}

/**
 * Pure helper to filter a list of lectures down to those visible to the given actor.
 * - Students see lectures from all courses in which they have an APPROVED enrollment.
 * - Instructors see lectures from all courses they teach.
 * - Admins see all lectures in active ITE courses.
 */
export function filterVisibleLecturesForActor<
  T extends {
    id?: string;
    isActive?: boolean;
    course: LectureCourseAccessSnapshot;
  },
>(
  first:
    | readonly T[]
    | {
        userId: string;
        role?: string | null;
        instituteCode?: string | null;
      },
  second:
    | {
        userId: string;
        role?: string | null;
        instituteCode?: string | null;
      }
    | readonly T[],
  enrollmentsByCourseId?: ReadonlyMap<string, string> | Record<string, string>
): T[] {
  const lectures = (Array.isArray(first) ? first : second) as readonly T[];
  const actor = (Array.isArray(first) ? second : first) as {
    userId: string;
    role?: string | null;
    instituteCode?: string | null;
  };
  return lectures.filter((item) => {
    let enrollmentStatus: string | undefined = undefined;
    if (enrollmentsByCourseId) {
      if (enrollmentsByCourseId instanceof Map) {
        enrollmentStatus = enrollmentsByCourseId.get(item.course.id) ?? "";
      } else {
        enrollmentStatus =
          (enrollmentsByCourseId as Record<string, string>)[item.course.id] ??
          "";
      }
    }
    return canActorViewLecture(actor, {
      course: item.course,
      isActive: item.isActive,
      enrollmentStatus,
    });
  });
}

// ─── Playback & View Progress Rules ──────────────────────────────────────────

export interface PlaybackStepInput {
  previousPositionSeconds: number;
  currentPositionSeconds: number;
  isPlaying: boolean;
  isSeeking?: boolean;
  playbackRate?: number;
}

export function accumulateWatchedStep(input: PlaybackStepInput): number {
  const {
    previousPositionSeconds,
    currentPositionSeconds,
    isPlaying,
    isSeeking = false,
    playbackRate = 1,
  } = input;

  if (!isPlaying || isSeeking) return 0;
  if (!Number.isFinite(playbackRate) || playbackRate <= 0 || playbackRate > 1.25) {
    return 0;
  }
  if (
    !Number.isFinite(previousPositionSeconds) ||
    !Number.isFinite(currentPositionSeconds) ||
    previousPositionSeconds < 0 ||
    currentPositionSeconds < 0
  ) {
    return 0;
  }

  const delta = currentPositionSeconds - previousPositionSeconds;
  if (delta <= 0 || delta > LECTURE_MAX_STEP_SECONDS) {
    return 0;
  }

  return delta;
}

export interface ExistingProgressSnapshot {
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  completedAt: Date | string | null;
}

export interface IncomingProgressPayload {
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  studentId?: string;
}

export interface MergedProgressValue {
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  completedAt: Date | null;
  percentWatched: number;
  isCompleted: boolean;
  status: Exclude<LectureWatchStatus, "NOT_TRACKED">;
}

export function validateAndMergeLectureProgress(params: {
  existing?: ExistingProgressSnapshot | null;
  input: IncomingProgressPayload;
  lectureDurationSeconds?: number;
  sourceType?: LectureSourceType;
  now?: Date;
}):
  | { ok: true; value: MergedProgressValue }
  | { ok: false; reason: string } {
  const {
    existing = null,
    input,
    lectureDurationSeconds = 0,
    sourceType = "UPLOAD",
    now = new Date(),
  } = params;

  if (sourceType === "DRIVE") {
    return {
      ok: false,
      reason: "Viewing progress is not tracked for Google Drive lectures.",
    };
  }

  const { lastPositionSeconds, watchedSeconds, durationSeconds } = input;

  if (
    typeof lastPositionSeconds !== "number" ||
    !Number.isFinite(lastPositionSeconds) ||
    lastPositionSeconds < 0
  ) {
    return {
      ok: false,
      reason: "Invalid playback position: must be a non-negative number.",
    };
  }

  if (
    typeof watchedSeconds !== "number" ||
    !Number.isFinite(watchedSeconds) ||
    watchedSeconds < 0
  ) {
    return {
      ok: false,
      reason: "Invalid watched time: must be a non-negative number.",
    };
  }

  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0
  ) {
    return {
      ok: false,
      reason: "Invalid video duration: must be a non-negative number.",
    };
  }

  const establishedDuration =
    lectureDurationSeconds > 0
      ? lectureDurationSeconds
      : (existing?.durationSeconds ?? 0) > 0
        ? existing!.durationSeconds
        : 0;

  if (
    establishedDuration > 0 &&
    durationSeconds > 0 &&
    Math.abs(durationSeconds - establishedDuration) >
      LECTURE_DURATION_TOLERANCE_SECONDS
  ) {
    return {
      ok: false,
      reason: `Reported video duration (${Math.round(durationSeconds)}s) does not match the recorded lecture duration (${Math.round(establishedDuration)}s).`,
    };
  }

  const effectiveDuration =
    establishedDuration > 0 ? establishedDuration : durationSeconds;

  if (effectiveDuration <= 0 && (watchedSeconds > 0 || lastPositionSeconds > 0)) {
    return {
      ok: false,
      reason: "Video duration must be positive when reporting playback progress.",
    };
  }

  if (
    effectiveDuration > 0 &&
    watchedSeconds > effectiveDuration + LECTURE_DURATION_TOLERANCE_SECONDS
  ) {
    return {
      ok: false,
      reason: "Watched seconds cannot exceed the lecture duration.",
    };
  }

  if (
    effectiveDuration > 0 &&
    lastPositionSeconds > effectiveDuration + LECTURE_DURATION_TOLERANCE_SECONDS
  ) {
    return {
      ok: false,
      reason: "Playback position cannot exceed the lecture duration.",
    };
  }

  const clampedPosition =
    effectiveDuration > 0
      ? Math.min(lastPositionSeconds, effectiveDuration)
      : lastPositionSeconds;

  const clampedIncomingWatched =
    effectiveDuration > 0
      ? Math.min(watchedSeconds, effectiveDuration)
      : watchedSeconds;

  const previousWatched = existing?.watchedSeconds ?? 0;
  const mergedWatched =
    effectiveDuration > 0
      ? Math.min(Math.max(previousWatched, clampedIncomingWatched), effectiveDuration)
      : Math.max(previousWatched, clampedIncomingWatched);

  const ratio = effectiveDuration > 0 ? mergedWatched / effectiveDuration : 0;
  const reachedNinetyPercent =
    effectiveDuration > 0 && ratio + 1e-9 >= LECTURE_COMPLETION_THRESHOLD;

  const existingCompletedAt = existing?.completedAt
    ? existing.completedAt instanceof Date
      ? existing.completedAt
      : new Date(existing.completedAt)
    : null;

  const completedAt =
    existingCompletedAt ?? (reachedNinetyPercent ? now : null);

  const percentWatched =
    effectiveDuration > 0
      ? Math.min(100, Math.round((mergedWatched / effectiveDuration) * 100))
      : 0;

  const isCompleted = completedAt !== null;
  const status: Exclude<LectureWatchStatus, "NOT_TRACKED"> = isCompleted
    ? "COMPLETED"
    : mergedWatched > 0 || clampedPosition > 0
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  return {
    ok: true,
    value: {
      lastPositionSeconds: Math.round(clampedPosition * 100) / 100,
      watchedSeconds: Math.round(mergedWatched * 100) / 100,
      durationSeconds: Math.round(effectiveDuration * 100) / 100,
      completedAt,
      percentWatched,
      isCompleted,
      status,
    },
  };
}

export function toStudentLectureProgressSummary(
  row: {
    lastPositionSeconds: number;
    watchedSeconds: number;
    durationSeconds: number;
    completedAt: Date | string | null;
    lastWatchedAt: Date | string | null;
  } | null,
  lectureDurationSeconds: number
): StudentLectureProgressSummary | null {
  if (!row) return null;
  const effectiveDuration = Math.max(
    lectureDurationSeconds || 0,
    row.durationSeconds || 0
  );
  const isCompleted =
    Boolean(row.completedAt) ||
    (effectiveDuration > 0 &&
      row.watchedSeconds / effectiveDuration + 1e-9 >=
        LECTURE_COMPLETION_THRESHOLD);
  const percentWatched =
    effectiveDuration > 0
      ? Math.min(100, Math.round((row.watchedSeconds / effectiveDuration) * 100))
      : isCompleted
        ? 100
        : 0;
  const status: Exclude<LectureWatchStatus, "NOT_TRACKED"> = isCompleted
    ? "COMPLETED"
    : row.watchedSeconds > 0 || row.lastPositionSeconds > 0
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  return {
    lastPositionSeconds: row.lastPositionSeconds,
    watchedSeconds: row.watchedSeconds,
    durationSeconds: effectiveDuration,
    percentWatched,
    completedAt: row.completedAt
      ? row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : row.completedAt
      : null,
    lastWatchedAt: row.lastWatchedAt
      ? row.lastWatchedAt instanceof Date
        ? row.lastWatchedAt.toISOString()
        : row.lastWatchedAt
      : null,
    status,
  };
}

// ─── Faculty Progress Table Join (Course-Enrolled Students Only) ─────────────

export function statusLabelForWatchStatus(
  status: LectureWatchStatus
): "Not started" | "In progress" | "Completed" | "Not tracked" {
  if (status === "NOT_TRACKED") return "Not tracked";
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

export function summarizeProgressRows(
  rows: readonly FacultyLectureProgressRow[]
): FacultyLectureProgressSummaryCounts {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  for (const row of rows) {
    if (row.status === "NOT_TRACKED") continue;
    if (row.status === "COMPLETED") completed += 1;
    else if (row.status === "IN_PROGRESS") inProgress += 1;
    else if (row.status === "NOT_STARTED") notStarted += 1;
  }
  return {
    total: rows.length,
    completed,
    inProgress,
    notStarted,
  };
}

/**
 * Joins ONLY the students currently enrolled (`status === "APPROVED"`) in the lecture's course
 * against the lecture's progress rows:
 * - Students who are not enrolled (or whose enrollment status is PENDING / DROPPED / REJECTED)
 *   NEVER appear in the table, even if they have historical progress rows in the database.
 * - Enrolled students who have never opened the lecture appear as "Not started" (0%).
 * - For DRIVE lectures: every enrolled student row has status "NOT_TRACKED" ("Not tracked"),
 *   excluded from completed / inProgress / notStarted counts.
 */
export function buildFacultyLectureProgressReport(params: {
  lectureId: string;
  lectureTitle: string;
  courseId?: string;
  courseCode?: string;
  courseTitle?: string;
  courseSection?: string;
  courseLabel?: string;
  lectureSourceType?: LectureSourceType;
  lectureDurationSeconds: number;
  students: IteStudentIdentity[];
  progressRows: Array<{
    studentId: string;
    lastPositionSeconds: number;
    watchedSeconds: number;
    durationSeconds: number;
    completedAt: Date | string | null;
    lastWatchedAt: Date | string | null;
  }>;
}): FacultyLectureProgressReport {
  const {
    lectureId,
    lectureTitle,
    courseId = "",
    courseCode = "",
    courseTitle = "",
    courseSection = "",
    courseLabel: explicitCourseLabel,
    lectureSourceType = "UPLOAD",
    lectureDurationSeconds,
    students,
    progressRows,
  } = params;

  const isProgressTracked = lectureSourceType !== "DRIVE";
  const lectureSourceLabel = LECTURE_SOURCE_LABELS[lectureSourceType];
  const courseLabel =
    explicitCourseLabel && explicitCourseLabel.trim()
      ? explicitCourseLabel.trim()
      : formatCourseSubjectLabel({
          code: courseCode,
          title: courseTitle,
          section: courseSection,
        });

  const progressByStudent = new Map<
    string,
    (typeof progressRows)[number]
  >();
  for (const row of progressRows) {
    progressByStudent.set(row.studentId, row);
  }

  const seenStudentIds = new Set<string>();
  const rows: FacultyLectureProgressRow[] = [];

  for (const student of students) {
    if (!student.id || seenStudentIds.has(student.id)) continue;
    // If enrollmentStatus is present on the candidate record, enforce APPROVED strictly
    if (
      student.enrollmentStatus !== undefined &&
      student.enrollmentStatus !== null &&
      !isApprovedCourseEnrollment(student.enrollmentStatus)
    ) {
      continue;
    }
    seenStudentIds.add(student.id);

    const programCode = student.programCode ?? null;
    const programLabel = programCode ?? "Unassigned";

    if (!isProgressTracked) {
      rows.push({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentNumber: student.studentNumber ?? null,
        programCode,
        programLabel,
        section: student.section ?? null,
        watchedSeconds: 0,
        lastPositionSeconds: 0,
        durationSeconds: lectureDurationSeconds,
        percentWatched: 0,
        status: "NOT_TRACKED",
        statusLabel: "Not tracked",
        completedAt: null,
        lastWatchedAt: null,
      });
      continue;
    }

    const prog = progressByStudent.get(student.id);
    if (
      !prog ||
      (prog.watchedSeconds <= 0 &&
        prog.lastPositionSeconds <= 0 &&
        !prog.completedAt)
    ) {
      rows.push({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentNumber: student.studentNumber ?? null,
        programCode,
        programLabel,
        section: student.section ?? null,
        watchedSeconds: 0,
        lastPositionSeconds: 0,
        durationSeconds: lectureDurationSeconds,
        percentWatched: 0,
        status: "NOT_STARTED",
        statusLabel: "Not started",
        completedAt: null,
        lastWatchedAt: null,
      });
      continue;
    }

    const summary = toStudentLectureProgressSummary(prog, lectureDurationSeconds)!;
    rows.push({
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentNumber: student.studentNumber ?? null,
      programCode,
      programLabel,
      section: student.section ?? null,
      watchedSeconds: summary.watchedSeconds,
      lastPositionSeconds: summary.lastPositionSeconds,
      durationSeconds: summary.durationSeconds,
      percentWatched: summary.percentWatched,
      status: summary.status,
      statusLabel: statusLabelForWatchStatus(summary.status),
      completedAt: summary.completedAt,
      lastWatchedAt: summary.lastWatchedAt,
    });
  }

  rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return {
    lectureId,
    lectureTitle,
    courseId,
    courseCode,
    courseTitle,
    courseSection,
    courseLabel,
    lectureSourceType,
    lectureSourceLabel,
    lectureDurationSeconds,
    isProgressTracked,
    trackingNote: isProgressTracked ? null : DRIVE_NOT_TRACKED_NOTE,
    availablePrograms: [...ITE_STUDENT_PROGRAM_CODES],
    summary: summarizeProgressRows(rows),
    rows,
  };
}

export type FacultyProgressSortField =
  | "name"
  | "program"
  | "percentWatched"
  | "lastWatchedAt"
  | "status";

export type FacultyProgramFilterValue = "ALL" | IteStudentProgramCode;

export function filterAndSortFacultyProgressRows(
  rows: FacultyLectureProgressRow[],
  options: {
    programFilter?: FacultyProgramFilterValue | string | null;
    query?: string | null;
    sortBy?: FacultyProgressSortField;
    sortDir?: "asc" | "desc";
  } = {}
): {
  rows: FacultyLectureProgressRow[];
  summary: FacultyLectureProgressSummaryCounts;
} {
  const {
    programFilter = "ALL",
    query = "",
    sortBy = "name",
    sortDir = "asc",
  } = options;

  const normalizedProgram = (programFilter ?? "ALL").trim();
  const byProgram =
    !normalizedProgram || normalizedProgram.toUpperCase() === "ALL"
      ? [...rows]
      : rows.filter((r) => r.programCode === normalizedProgram);

  const summary = summarizeProgressRows(byProgram);

  const trimmedQuery = (query ?? "").trim().toLowerCase();
  const filtered = trimmedQuery
    ? byProgram.filter(
        (r) =>
          r.studentName.toLowerCase().includes(trimmedQuery) ||
          (r.studentNumber &&
            r.studentNumber.toLowerCase().includes(trimmedQuery)) ||
          (r.section && r.section.toLowerCase().includes(trimmedQuery)) ||
          r.programLabel.toLowerCase().includes(trimmedQuery)
      )
    : byProgram;

  const statusOrder: Record<LectureWatchStatus, number> = {
    NOT_TRACKED: -1,
    NOT_STARTED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
  };

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") {
      cmp = a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "program") {
      cmp = a.programLabel.localeCompare(b.programLabel);
      if (cmp === 0) cmp = a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "percentWatched") {
      cmp = a.percentWatched - b.percentWatched;
      if (cmp === 0) cmp = a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "status") {
      cmp = statusOrder[a.status] - statusOrder[b.status];
      if (cmp === 0) cmp = a.percentWatched - b.percentWatched;
      if (cmp === 0) cmp = a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "lastWatchedAt") {
      const timeA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
      const timeB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
      cmp = timeA - timeB;
      if (cmp === 0) cmp = a.studentName.localeCompare(b.studentName);
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  return { rows: filtered, summary };
}

export function formatDurationTimestamp(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const totalSecs = Math.round(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function resolveStreamableUploadLecture(
  lecture: {
    id: string;
    sourceType?: string | null;
    storageUrl?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    fileName?: string | null;
  } | null | undefined
): {
  id: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
} | null {
  if (!lecture) return null;
  const sourceType = lecture.sourceType ?? "UPLOAD";
  if (sourceType !== "UPLOAD") return null;
  if (
    !lecture.storageUrl ||
    !lecture.mimeType ||
    !lecture.fileSize ||
    lecture.fileSize <= 0 ||
    !lecture.fileName
  ) {
    return null;
  }
  return {
    id: lecture.id,
    storageUrl: lecture.storageUrl,
    mimeType: lecture.mimeType,
    fileSize: lecture.fileSize,
    fileName: lecture.fileName,
  };
}

export const LECTURE_STREAM_CHUNK_BYTES = 8 * 1024 * 1024; // 8 MB per range response chunk

export type ParsedHttpByteRange =
  | {
      kind: "none";
    }
  | {
      kind: "partial";
      status: 206;
      start: number;
      end: number;
      contentLength: number;
      contentRange: string;
      upstreamRangeHeader: string;
    }
  | {
      kind: "unsatisfiable";
      status: 416;
      contentRange: string;
    };

export function parseHttpByteRange(
  rangeHeader: string | null | undefined,
  fileSize: number,
  maxChunkBytes: number = LECTURE_STREAM_CHUNK_BYTES
): ParsedHttpByteRange {
  if (!rangeHeader || !rangeHeader.trim()) {
    return { kind: "none" };
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return {
      kind: "unsatisfiable",
      status: 416,
      contentRange: "bytes */0",
    };
  }

  const trimmed = rangeHeader.trim();
  const match = /^bytes=([^,]+)$/i.exec(trimmed);
  if (!match) {
    return {
      kind: "unsatisfiable",
      status: 416,
      contentRange: `bytes */${fileSize}`,
    };
  }

  const spec = match[1].trim();
  const dashIndex = spec.indexOf("-");
  if (dashIndex === -1) {
    return {
      kind: "unsatisfiable",
      status: 416,
      contentRange: `bytes */${fileSize}`,
    };
  }

  const startPart = spec.slice(0, dashIndex).trim();
  const endPart = spec.slice(dashIndex + 1).trim();

  let start: number;
  let end: number;

  if (startPart === "") {
    if (!/^\d+$/.test(endPart)) {
      return {
        kind: "unsatisfiable",
        status: 416,
        contentRange: `bytes */${fileSize}`,
      };
    }
    const suffixLength = Number(endPart);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return {
        kind: "unsatisfiable",
        status: 416,
        contentRange: `bytes */${fileSize}`,
      };
    }
    const clampedSuffix = Math.min(suffixLength, fileSize, maxChunkBytes);
    start = fileSize - clampedSuffix;
    end = fileSize - 1;
  } else {
    if (!/^\d+$/.test(startPart)) {
      return {
        kind: "unsatisfiable",
        status: 416,
        contentRange: `bytes */${fileSize}`,
      };
    }
    start = Number(startPart);
    if (!Number.isSafeInteger(start) || start < 0 || start >= fileSize) {
      return {
        kind: "unsatisfiable",
        status: 416,
        contentRange: `bytes */${fileSize}`,
      };
    }

    if (endPart === "") {
      end = Math.min(start + maxChunkBytes - 1, fileSize - 1);
    } else {
      if (!/^\d+$/.test(endPart)) {
        return {
          kind: "unsatisfiable",
          status: 416,
          contentRange: `bytes */${fileSize}`,
        };
      }
      const requestedEnd = Number(endPart);
      if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
        return {
          kind: "unsatisfiable",
          status: 416,
          contentRange: `bytes */${fileSize}`,
        };
      }
      end = Math.min(requestedEnd, start + maxChunkBytes - 1, fileSize - 1);
    }
  }

  const contentLength = end - start + 1;
  return {
    kind: "partial",
    status: 206,
    start,
    end,
    contentLength,
    contentRange: `bytes ${start}-${end}/${fileSize}`,
    upstreamRangeHeader: `bytes=${start}-${end}`,
  };
}

// ─── API Error Classification (Validation, Course Auth, DB Migration, Unknown) ─

export const LECTURE_DB_NOT_MIGRATED_MESSAGE =
  "Lecture Videos database tables or columns have not been migrated yet. Please ask the database administrator to apply the pending Prisma migration (20261114070000_ite_lecture_videos).";

export const LECTURE_UNEXPECTED_ERROR_MESSAGE =
  "An unexpected error occurred.";

export type LectureApiErrorKind =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "NOT_YOUR_COURSE"
  | "NOT_FOUND"
  | "DATABASE_NOT_MIGRATED"
  | "UNKNOWN";

export interface ClassifiedLectureApiError {
  kind: LectureApiErrorKind;
  status: number;
  message: string;
}

/**
 * Detects whether a thrown database / Prisma error is caused by missing `IteLectureVideo` /
 * `IteLectureVideoProgress` tables (`P2021` / PostgreSQL `42P01` / `TableDoesNotExist`) or
 * missing columns (`P2022` / PostgreSQL `42703` / `ColumnDoesNotExist`).
 */
export function isLectureDatabaseNotMigratedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;

  const prismaCode = typeof record.code === "string" ? record.code : "";
  if (prismaCode === "P2021" || prismaCode === "P2022") {
    return true;
  }

  const meta =
    record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : null;
  const driverAdapterError =
    meta?.driverAdapterError && typeof meta.driverAdapterError === "object"
      ? (meta.driverAdapterError as Record<string, unknown>)
      : null;
  const cause =
    driverAdapterError?.cause && typeof driverAdapterError.cause === "object"
      ? (driverAdapterError.cause as Record<string, unknown>)
      : null;

  const originalCode =
    typeof cause?.originalCode === "string"
      ? cause.originalCode
      : typeof record.originalCode === "string"
        ? record.originalCode
        : "";
  if (originalCode === "42P01" || originalCode === "42703") {
    return true;
  }

  const causeKind = typeof cause?.kind === "string" ? cause.kind : "";
  if (
    causeKind === "TableDoesNotExist" ||
    causeKind === "ColumnDoesNotExist"
  ) {
    return true;
  }

  const message = typeof record.message === "string" ? record.message : "";
  if (
    /table\s+.*IteLectureVideo.*does not exist/i.test(message) ||
    /relation\s+.*IteLectureVideo.*does not exist/i.test(message) ||
    /column\s+.*IteLectureVideo.*does not exist/i.test(message) ||
    /column\s+"?(courseId|sourceType|externalVideoId|externalUrl|storagePathname)"?.*does not exist/i.test(
      message
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Classifies an error caught in Lecture Videos API routes into a specific, safe user-facing
 * response for known failures (validation, not your course / forbidden, not found, database not
 * migrated yet) while keeping unknown errors generic ("An unexpected error occurred.").
 */
export function classifyLectureVideoApiError(
  err: unknown
): ClassifiedLectureApiError {
  if (isLectureDatabaseNotMigratedError(err)) {
    return {
      kind: "DATABASE_NOT_MIGRATED",
      status: 503,
      message: LECTURE_DB_NOT_MIGRATED_MESSAGE,
    };
  }

  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    const status = (err as { status: number }).status;
    const rawMessage =
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message.trim()
        : "";

    if (status === 400 || status === 422) {
      return {
        kind: "VALIDATION",
        status,
        message: rawMessage || "Invalid lecture request.",
      };
    }
    if (status === 401) {
      return {
        kind: "UNAUTHENTICATED",
        status: 401,
        message: rawMessage || "Authentication required.",
      };
    }
    if (status === 403) {
      return {
        kind: "NOT_YOUR_COURSE",
        status: 403,
        message:
          rawMessage ||
          "You can only assign lectures to ITE courses you teach.",
      };
    }
    if (status === 404) {
      return {
        kind: "NOT_FOUND",
        status: 404,
        message: rawMessage || "Selected subject or lecture was not found.",
      };
    }
    if (status >= 400 && status < 500 && rawMessage) {
      return {
        kind: "VALIDATION",
        status,
        message: rawMessage,
      };
    }
  }

  return {
    kind: "UNKNOWN",
    status: 500,
    message: LECTURE_UNEXPECTED_ERROR_MESSAGE,
  };
}
