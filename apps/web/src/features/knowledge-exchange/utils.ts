/**
 * apps/web/src/features/knowledge-exchange/utils.ts
 *
 * Serializers, author masking, and date formatting utilities.
 */

import type { KxAuthorSummary } from "./types";

interface RawUserRecord {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  studentNumber?: string | null;
  avatarUrl?: string | null;
}

interface ViewerContext {
  id?: string | null;
  role?: string | null;
}

/**
 * Serializes and securely redacts author identity when isAnonymous is true.
 *
 * Server-Side Redaction Invariant:
 * - Peer students NEVER receive real author id, name, email, studentNumber, or avatarUrl.
 * - When isAnonymous is true, peers only see "Anonymous Student" or "Anonymous Instructor".
 * - Admins and Instructors can see real identity for audit/moderation purposes.
 */
export function serializeAuthor(
  author: RawUserRecord,
  isAnonymous: boolean,
  viewer?: ViewerContext | null
): KxAuthorSummary {
  const isAuthorSelf = Boolean(viewer?.id && viewer.id === author.id);
  const viewerRole = viewer?.role ? viewer.role.toUpperCase() : "";
  const isViewerAdminOrStaff =
    viewerRole === "ADMIN" ||
    viewerRole === "PROFESSOR" ||
    viewerRole === "INSTRUCTOR" ||
    viewerRole === "TEACHER";

  const isInstructorAuthor =
    author.role.toUpperCase() === "PROFESSOR" ||
    author.role.toUpperCase() === "INSTRUCTOR" ||
    author.role.toUpperCase() === "TEACHER";

  const anonymousAlias = isInstructorAuthor
    ? "Anonymous Instructor"
    : "Anonymous Student";

  if (isAnonymous) {
    // Administrators have audit privileges to see the real student or instructor author
    if (viewerRole === "ADMIN") {
      return {
        id: author.id,
        name: author.name,
        role: author.role,
        avatarUrl: author.avatarUrl ?? null,
        studentNumber: author.studentNumber ?? null,
        email: author.email ?? null,
        isAnonymous: true,
        isSelf: isAuthorSelf,
        maskedName: anonymousAlias,
        realName: author.name,
      };
    }

    // Peer students and non-admin viewers see strictly the anonymous alias
    return {
      id: null,
      name: anonymousAlias,
      role: isInstructorAuthor ? "INSTRUCTOR" : "STUDENT",
      avatarUrl: null,
      studentNumber: null,
      email: null,
      isAnonymous: true,
      isSelf: isAuthorSelf,
      maskedName: anonymousAlias,
    };
  }

  // Non-anonymous post
  return {
    id: author.id,
    name: author.name,
    role: author.role,
    avatarUrl: author.avatarUrl ?? null,
    studentNumber: (isViewerAdminOrStaff || isAuthorSelf) ? (author.studentNumber ?? null) : null,
    email: (isViewerAdminOrStaff || isAuthorSelf) ? (author.email ?? null) : null,
    isAnonymous: false,
    isSelf: isAuthorSelf,
  };
}

/**
 * Friendly relative time formatter (e.g. "Just now", "5m ago", "2h ago", "3d ago").
 */
export function formatRelativeTime(dateInput: string | Date | number): string {
  const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 60_000) return "Just now";
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Transforms arbitrary string into a URL-friendly tag slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sanitizes markdown HTML output to prevent XSS (script injection, malicious iframes, event handlers, javascript: URIs).
 */
export function sanitizeKxHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  return rawHtml
    // Strip dangerous tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    // Remove dangerous href/src URIs while allowing safe image data URIs
    .replace(/href\s*=\s*["']\s*(javascript|data):[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']\s*(javascript|(?:data:(?!image\/)))[^"']*["']/gi, 'src=""')
    // Remove on* event handlers
    .replace(/\son[a-zA-Z]+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son[a-zA-Z]+\s*=\s*[^>\s]+/gi, "");
}
