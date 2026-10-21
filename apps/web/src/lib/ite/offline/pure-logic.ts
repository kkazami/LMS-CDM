/**
 * apps/web/src/lib/ite/offline/pure-logic.ts
 *
 * Pure, side-effect-free logic for ITE Offline Access & Auto Sync.
 * 100% unit testable without DOM, network, or database dependencies.
 */

import type { PendingFlashcardReview, SubmissionDraft } from "./types";

/** Maximum number of retry attempts before marking review sync as permanently failed */
export const MAX_RETRY_ATTEMPTS = 5;

/** Maximum number of material pages allowed in the cache before LRU eviction */
export const MAX_CACHED_MATERIALS = 40;

/** Current cache version prefix */
export const CACHE_VERSION = "ite-offline-v1";

/**
 * Derives the per-user CacheStorage name.
 */
export function getUserCacheName(userId: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required for namespacing");
  }
  return `${CACHE_VERSION}-${userId}`;
}

/**
 * Derives the per-user IndexedDB database name.
 */
export function getUserDbName(userId: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required for namespacing");
  }
  return `ite-offline-${userId}`;
}

/**
 * Decides whether a given network request and response can be safely cached by the service worker.
 */
export function decideCacheability(input: {
  method: string;
  url: string;
  status?: number;
  headers?: Record<string, string> | Headers;
  redirected?: boolean;
}): { cacheable: boolean; reason?: string } {
  const method = (input.method || "").toUpperCase();
  if (method !== "GET") {
    return { cacheable: false, reason: "Non-GET requests must never be cached" };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.url, "http://localhost");
  } catch {
    return { cacheable: false, reason: "Invalid URL" };
  }

  const pathname = parsed.pathname;

  // 1. Disallow any API route
  if (pathname.startsWith("/api/")) {
    return { cacheable: false, reason: "API routes must never be cached by service worker" };
  }

  // 2. Disallow auth pages & public landing
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/activate") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return { cacheable: false, reason: "Auth and public pages must never be cached" };
  }

  // 3. Disallow non-ITE institutes
  if (pathname.startsWith("/ics/") || pathname.startsWith("/ibe/")) {
    return { cacheable: false, reason: "Non-ITE institute routes must never be cached" };
  }

  // 4. Disallow instructor / admin pages under ITE
  if (
    pathname.startsWith("/ite/teachers") ||
    pathname.startsWith("/ite/admin") ||
    pathname.startsWith("/ite/organization") ||
    pathname.startsWith("/ite/faculty") ||
    pathname.startsWith("/ite/reports")
  ) {
    return { cacheable: false, reason: "Instructor and admin views must never be cached" };
  }

  // 5. Allowed URL patterns:
  // a) Next.js static assets and fonts
  const isNextStatic = pathname.startsWith("/_next/static/") || pathname.endsWith(".css") || pathname.endsWith(".js") || pathname.endsWith(".woff2");
  
  // b) ITE learning material reading view
  const isIteMaterialRead = /^\/ite\/learning-materials\/[^/]+\/[^/]+\/read\/?$/.test(pathname);

  // c) ITE flashcards dashboard and study
  const isIteFlashcards = /^\/ite\/flashcards(\/.*)?$/.test(pathname);

  // d) Attachments opened for learning materials (uploads or blob attachments)
  const isAttachment = pathname.startsWith("/uploads/") || (parsed.hostname.includes("blob.vercel-storage.com") && pathname.includes("uploads/"));

  if (!isNextStatic && !isIteMaterialRead && !isIteFlashcards && !isAttachment) {
    return { cacheable: false, reason: "URL does not match allowed ITE student offline resources" };
  }

  // If response metadata was provided, validate response status and headers
  if (input.status !== undefined) {
    if (input.status !== 200) {
      return { cacheable: false, reason: `Response status ${input.status} is not 200` };
    }
  }

  if (input.redirected) {
    return { cacheable: false, reason: "Redirected responses must never be cached" };
  }

  if (input.headers) {
    const getHeader = (name: string): string | null => {
      if (input.headers instanceof Headers) {
        return input.headers.get(name);
      }
      return input.headers?.[name] || input.headers?.[name.toLowerCase()] || null;
    };

    const setCookie = getHeader("set-cookie");
    if (setCookie) {
      return { cacheable: false, reason: "Responses containing Set-Cookie must never be cached" };
    }

    const cacheControl = (getHeader("cache-control") || "").toLowerCase();
    if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
      return { cacheable: false, reason: "Responses with no-store or private Cache-Control must not be cached" };
    }
  }

  return { cacheable: true };
}

/**
 * Generates a valid UUID v4 for client-side idempotency.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator for test environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a client-provided idempotency key is a valid UUID string of at most 64 characters.
 */
export function isValidIdempotencyKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return false;
  return UUID_REGEX.test(trimmed);
}

/**
 * Formats a namespaced idempotency key for database storage and lookup (e.g. fc:<userId>:<clientKey>).
 * Returns null if the client key is invalid.
 */
export function formatNamespacedIdempotencyKey(userId: string, clientKey: unknown): string | null {
  if (!userId || typeof userId !== "string") return null;
  if (!isValidIdempotencyKey(clientKey)) return null;
  return `fc:${userId}:${clientKey.trim()}`;
}

/**
 * Enqueues a flashcard review session, preventing duplicate enqueues by idempotency key.
 */
export function enqueueReview(
  existingQueue: PendingFlashcardReview[],
  newReview: Omit<PendingFlashcardReview, "id" | "retryCount" | "status">
): { queue: PendingFlashcardReview[]; added: boolean } {
  // Check if idempotencyKey already in queue
  const exists = existingQueue.some((r) => r.idempotencyKey === newReview.idempotencyKey);
  if (exists) {
    return { queue: existingQueue, added: false };
  }

  const review: PendingFlashcardReview = {
    ...newReview,
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    retryCount: 0,
    status: "PENDING",
  };

  return {
    queue: [...existingQueue, review],
    added: true,
  };
}

/**
 * Deduplicates a queue of reviews by idempotencyKey, preserving earliest timestamp.
 */
export function dedupeQueue(queue: PendingFlashcardReview[]): PendingFlashcardReview[] {
  const seen = new Set<string>();
  const result: PendingFlashcardReview[] = [];

  for (const item of queue) {
    if (!seen.has(item.idempotencyKey)) {
      seen.add(item.idempotencyKey);
      result.push(item);
    }
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Computes exponential backoff delay in milliseconds.
 * Base 1000ms, max 30000ms.
 */
export function calculateBackoff(retryCount: number): number {
  if (retryCount <= 0) return 0;
  const base = 1000;
  const max = 30000;
  const delay = base * Math.pow(2, retryCount - 1);
  return Math.min(delay, max);
}

/**
 * Computes schedule backoff delay in milliseconds for retry counts.
 */
export function computeRetryDelayMs(retryCount: number): number {
  if (retryCount <= 0) return 1000;
  const base = 1000;
  const max = 30000;
  const delay = base * Math.pow(2, retryCount);
  return Math.min(delay, max);
}

/**
 * Determines whether retry attempts have reached the maximum retry ceiling.
 */
export function shouldGiveUpRetry(retryCount: number): boolean {
  return retryCount >= MAX_RETRY_ATTEMPTS;
}

/**
 * Finds the least recently used cache entry when the cache size limit is reached.
 */
export function findEvictionCandidate(
  entries: { url: string; lastAccessed: number }[],
  limit: number = MAX_CACHED_MATERIALS
): string | null {
  if (entries.length < limit) return null;
  const sorted = [...entries].sort((a, b) => a.lastAccessed - b.lastAccessed);
  return sorted[0]?.url || null;
}

/**
 * Validates a submission draft.
 */
export function validateSubmissionDraft(draft: {
  itemId?: string;
  courseId?: string;
  userId?: string;
  textAnswer?: string;
  links?: { url: string; fileName: string }[];
  updatedAt?: number;
}): { valid: boolean; reason?: string } {
  if (!draft.itemId || typeof draft.itemId !== "string" || !draft.itemId.trim()) {
    return { valid: false, reason: "itemId is required" };
  }
  if (!draft.courseId || typeof draft.courseId !== "string" || !draft.courseId.trim()) {
    return { valid: false, reason: "courseId is required" };
  }
  return { valid: true };
}

/**
 * Enqueues a flashcard review with pure function semantics.
 */
export function enqueueFlashcardReview(
  queue: PendingFlashcardReview[],
  input: {
    deckId: string;
    cardsReviewed: number;
    durationSeconds: number;
    idempotencyKey: string;
  }
): PendingFlashcardReview {
  const existing = queue.find((r) => r.idempotencyKey === input.idempotencyKey);
  if (existing) {
    return existing;
  }
  const item: PendingFlashcardReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deckId: input.deckId,
    cardsReviewed: input.cardsReviewed,
    durationSeconds: input.durationSeconds,
    idempotencyKey: input.idempotencyKey,
    timestamp: Date.now(),
    retryCount: 0,
    status: "PENDING",
  };
  queue.push(item);
  return item;
}

/**
 * Validates a submission draft.
 */
export function isDraftValid(draft: Partial<SubmissionDraft>): boolean {
  if (!draft.itemId || typeof draft.itemId !== "string" || !draft.itemId.trim()) {
    return false;
  }
  if (!draft.courseId || typeof draft.courseId !== "string" || !draft.courseId.trim()) {
    return false;
  }
  const hasText = Boolean(draft.text && draft.text.trim().length > 0);
  const hasLinks = Array.isArray(draft.links) && draft.links.length > 0;
  return hasText || hasLinks;
}

/**
 * Formats a Date or timestamp into a friendly Manila time string.
 */
export function formatManilaTime(dateOrTimestamp: Date | number): string {
  const d = typeof dateOrTimestamp === "number" ? new Date(dateOrTimestamp) : dateOrTimestamp;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Detects whether a request is an RSC payload or router prefetch request.
 * Next.js sends `RSC: 1` header, `Next-Router-Prefetch` / `Next-Router-State-Tree`,
 * or a `_rsc` query parameter on client-side flight/navigation requests.
 */
export function isRscOrPrefetchRequest(input: {
  headers?: Record<string, string | null | undefined> | Headers;
  url?: string;
}): boolean {
  if (input.url) {
    try {
      const parsed = new URL(input.url, "http://localhost");
      if (parsed.searchParams.has("_rsc")) {
        return true;
      }
    } catch {
      // ignore invalid URL
    }
  }

  if (input.headers) {
    if (typeof (input.headers as Headers).get === "function") {
      const h = input.headers as Headers;
      const rsc = h.get("RSC") || h.get("rsc");
      if (rsc === "1" || rsc === "true") return true;
      if (h.has("next-router-prefetch") || h.has("Next-Router-Prefetch") || h.has("next-router-state-tree")) {
        return true;
      }
    } else {
      const h = input.headers as Record<string, string | null | undefined>;
      const lowerKeys = Object.keys(h).reduce<Record<string, string | null | undefined>>((acc, k) => {
        acc[k.toLowerCase()] = h[k];
        return acc;
      }, {});
      if (lowerKeys["rsc"] === "1" || lowerKeys["rsc"] === "true") return true;
      if (lowerKeys["next-router-prefetch"] || lowerKeys["next-router-state-tree"]) return true;
    }
  }

  return false;
}

/**
 * Checks whether an anchor link click is eligible for full browser navigation
 * while offline in the ITE student dashboard.
 */
export function isEligibleOfflineNavigationLink(args: {
  href: string;
  origin: string;
  target?: string | null;
  hasModifierKey?: boolean;
}): boolean {
  if (args.hasModifierKey) return false;
  if (args.target && args.target !== "_self") return false;
  if (!args.href || args.href.startsWith("#") || args.href.startsWith("javascript:")) return false;
  if (args.href.startsWith("mailto:") || args.href.startsWith("tel:")) return false;

  try {
    const parsed = new URL(args.href, args.origin);
    // Must be strictly same origin
    if (parsed.origin !== args.origin) return false;

    // Must be under /ite/
    const pathname = parsed.pathname;
    if (!pathname.startsWith("/ite/") && pathname !== "/ite") return false;

    // Exclude API, admin, and teacher routes
    if (pathname.startsWith("/api/")) return false;
    if (pathname.startsWith("/ite/teachers") || pathname.startsWith("/ite/admin")) return false;

    return true;
  } catch {
    return false;
  }
}

