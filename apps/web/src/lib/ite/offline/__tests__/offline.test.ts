/**
 * apps/web/src/lib/ite/offline/__tests__/offline.test.ts
 *
 * Comprehensive unit test suite for ITE Offline Access & Auto Sync:
 * - Queue logic (enqueue, dedupe by idempotency key, FIFO ordering, backoff, retry limits)
 * - Per-user namespacing and storage isolation
 * - Access control and eligibility evaluation (ITE students only)
 * - Service worker cacheability decision function (allowed vs rejected patterns, headers, eviction)
 * - Submission draft validation and Manila time formatting
 * - Middleware static extension matching for /ite-sw.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getUserCacheName,
  getUserDbName,
  decideCacheability,
  enqueueFlashcardReview,
  computeRetryDelayMs,
  shouldGiveUpRetry,
  findEvictionCandidate,
  validateSubmissionDraft,
  formatManilaTime,
  MAX_RETRY_ATTEMPTS,
  MAX_CACHED_MATERIALS,
  CACHE_VERSION,
  isRscOrPrefetchRequest,
  isEligibleOfflineNavigationLink,
  classifyReviewSyncResponse,
  applyReviewSyncAction,
  AUTH_EXPIRED_SYNC_MESSAGE,
} from "../pure-logic";

import { evaluateOfflineAccess } from "../guard";
import type { PendingFlashcardReview } from "../types";

describe("ITE Offline: Queue Logic", () => {
  it("enqueues a review item with PENDING status, 0 retries, and generated timestamps", () => {
    const queue: PendingFlashcardReview[] = [];
    const item = enqueueFlashcardReview(queue, {
      deckId: "deck_101",
      cardsReviewed: 15,
      durationSeconds: 120,
      idempotencyKey: "idem_uuid_1",
    });

    assert.equal(queue.length, 1);
    assert.equal(item.status, "PENDING");
    assert.equal(item.retryCount, 0);
    assert.equal(item.idempotencyKey, "idem_uuid_1");
    assert.equal(item.cardsReviewed, 15);
    assert.ok(item.timestamp > 0);
  });

  it("deduplicates review by idempotency key and prevents duplicate enqueuing", () => {
    const queue: PendingFlashcardReview[] = [];
    enqueueFlashcardReview(queue, {
      deckId: "deck_101",
      cardsReviewed: 10,
      durationSeconds: 60,
      idempotencyKey: "duplicate_key_1",
    });

    assert.equal(queue.length, 1);

    // Attempt to enqueue identical idempotency key
    const duplicate = enqueueFlashcardReview(queue, {
      deckId: "deck_101",
      cardsReviewed: 10,
      durationSeconds: 60,
      idempotencyKey: "duplicate_key_1",
    });

    assert.equal(queue.length, 1, "Queue length should remain 1");
    assert.equal(duplicate.id, queue[0].id, "Should return existing item");
  });

  it("preserves FIFO ordering across multiple items", () => {
    const queue: PendingFlashcardReview[] = [];
    enqueueFlashcardReview(queue, {
      deckId: "deck_A",
      cardsReviewed: 5,
      durationSeconds: 30,
      idempotencyKey: "key_A",
    });
    enqueueFlashcardReview(queue, {
      deckId: "deck_B",
      cardsReviewed: 8,
      durationSeconds: 45,
      idempotencyKey: "key_B",
    });

    assert.equal(queue[0].deckId, "deck_A");
    assert.equal(queue[1].deckId, "deck_B");
  });

  it("calculates exponential backoff delay capped at 30 seconds", () => {
    assert.equal(computeRetryDelayMs(0), 1000);
    assert.equal(computeRetryDelayMs(1), 2000);
    assert.equal(computeRetryDelayMs(2), 4000);
    assert.equal(computeRetryDelayMs(3), 8000);
    assert.equal(computeRetryDelayMs(4), 16000);
    assert.equal(computeRetryDelayMs(5), 30000); // capped at 30s
    assert.equal(computeRetryDelayMs(10), 30000);
  });

  it("identifies when retry limit is exceeded", () => {
    assert.equal(shouldGiveUpRetry(0), false);
    assert.equal(shouldGiveUpRetry(MAX_RETRY_ATTEMPTS - 1), false);
    assert.equal(shouldGiveUpRetry(MAX_RETRY_ATTEMPTS), true);
    assert.equal(shouldGiveUpRetry(MAX_RETRY_ATTEMPTS + 1), true);
  });
});

describe("ITE Offline: Namespacing & Isolation", () => {
  it("derives distinct, non-overlapping CacheStorage names per student user ID", () => {
    const cacheStudentA = getUserCacheName("student_alpha_123");
    const cacheStudentB = getUserCacheName("student_beta_456");

    assert.notEqual(cacheStudentA, cacheStudentB);
    assert.equal(cacheStudentA, `${CACHE_VERSION}-student_alpha_123`);
    assert.equal(cacheStudentB, `${CACHE_VERSION}-student_beta_456`);
  });

  it("derives distinct, non-overlapping IndexedDB database names per student user ID", () => {
    const dbStudentA = getUserDbName("student_alpha_123");
    const dbStudentB = getUserDbName("student_beta_456");

    assert.notEqual(dbStudentA, dbStudentB);
    assert.equal(dbStudentA, "ite-offline-student_alpha_123");
    assert.equal(dbStudentB, "ite-offline-student_beta_456");
  });

  it("throws when userId is empty or non-string", () => {
    assert.throws(() => getUserCacheName(""));
    assert.throws(() => getUserDbName(""));
  });
});

describe("ITE Offline: Access Control & Eligibility", () => {
  it("grants access to ITE students", () => {
    const res = evaluateOfflineAccess({
      institute: "ite",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(res.allowed, true);
    assert.equal(res.statusCode, 200);
  });

  it("denies access to ITE instructors and professors with 403", () => {
    const resProf = evaluateOfflineAccess({
      institute: "ite",
      userRole: "PROFESSOR",
      isSuperUser: false,
    });
    assert.equal(resProf.allowed, false);
    assert.equal(resProf.statusCode, 403);

    const resTeach = evaluateOfflineAccess({
      institute: "ite",
      userRole: "TEACHER",
      isSuperUser: false,
    });
    assert.equal(resTeach.allowed, false);
    assert.equal(resTeach.statusCode, 403);
  });

  it("denies access to ITE administrators and super users with 403", () => {
    const resAdmin = evaluateOfflineAccess({
      institute: "ite",
      userRole: "ADMIN",
      isSuperUser: false,
    });
    assert.equal(resAdmin.allowed, false);
    assert.equal(resAdmin.statusCode, 403);

    const resSuper = evaluateOfflineAccess({
      institute: "ite",
      userRole: "STUDENT",
      isSuperUser: true,
    });
    assert.equal(resSuper.allowed, false);
    assert.equal(resSuper.statusCode, 403);
  });

  it("denies access to ICS and IBE users with 403", () => {
    const resIcs = evaluateOfflineAccess({
      institute: "ics",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(resIcs.allowed, false);
    assert.equal(resIcs.statusCode, 403);

    const resIbe = evaluateOfflineAccess({
      institute: "ibe",
      userRole: "STUDENT",
      isSuperUser: false,
    });
    assert.equal(resIbe.allowed, false);
    assert.equal(resIbe.statusCode, 403);
  });
});

describe("ITE Offline: Cacheability Decision Engine", () => {
  it("rejects non-GET HTTP methods", () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
      const res = decideCacheability({
        method,
        url: "http://localhost/ite/learning-materials/c1/m1/read",
      });
      assert.equal(res.cacheable, false);
    }
  });

  it("rejects all /api routes", () => {
    const res = decideCacheability({
      method: "GET",
      url: "http://localhost/api/ite/offline/ping",
    });
    assert.equal(res.cacheable, false);

    const resFlash = decideCacheability({
      method: "GET",
      url: "http://localhost/api/flashcards/deck-123",
    });
    assert.equal(resFlash.cacheable, false);
  });

  it("rejects authentication and public routes", () => {
    for (const path of ["/", "/login", "/register", "/forgot-password", "/reset-password"]) {
      const res = decideCacheability({
        method: "GET",
        url: `http://localhost${path}`,
      });
      assert.equal(res.cacheable, false);
    }
  });

  it("rejects non-ITE institute routes", () => {
    const resIcs = decideCacheability({
      method: "GET",
      url: "http://localhost/ics/learning-materials/c1/m1/read",
    });
    assert.equal(resIcs.cacheable, false);

    const resIbe = decideCacheability({
      method: "GET",
      url: "http://localhost/ibe/learning-materials/c1/m1/read",
    });
    assert.equal(resIbe.cacheable, false);
  });

  it("rejects instructor and administrator paths", () => {
    const res = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/teachers/dashboard",
    });
    assert.equal(res.cacheable, false);

    const resAdmin = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/admin/users",
    });
    assert.equal(resAdmin.cacheable, false);
  });

  it("rejects login redirects and non-200 responses", () => {
    const resRedirect = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      redirected: true,
      status: 200,
    });
    assert.equal(resRedirect.cacheable, false);

    const res404 = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      status: 404,
    });
    assert.equal(res404.cacheable, false);
  });

  it("rejects responses containing Set-Cookie or no-store/private cache-control", () => {
    const resCookie = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      status: 200,
      headers: { "set-cookie": "session=abc123" },
    });
    assert.equal(resCookie.cacheable, false);

    const resNoStore = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      status: 200,
      headers: { "cache-control": "no-store, must-revalidate" },
    });
    assert.equal(resNoStore.cacheable, false);

    const resPrivate = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      status: 200,
      headers: { "cache-control": "private" },
    });
    assert.equal(resPrivate.cacheable, false);
  });

  it("accepts allowed ITE learning materials, flashcards, static assets, and attachments", () => {
    const resMaterial = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/learning-materials/c1/m1/read",
      status: 200,
    });
    assert.equal(resMaterial.cacheable, true);

    const resFlash = decideCacheability({
      method: "GET",
      url: "http://localhost/ite/flashcards",
      status: 200,
    });
    assert.equal(resFlash.cacheable, true);

    const resStatic = decideCacheability({
      method: "GET",
      url: "http://localhost/_next/static/chunks/app-bundle.js",
      status: 200,
    });
    assert.equal(resStatic.cacheable, true);

    const resUpload = decideCacheability({
      method: "GET",
      url: "http://localhost/uploads/lecture1.pdf",
      status: 200,
    });
    assert.equal(resUpload.cacheable, true);
  });

  it("evicts least recently used URL when material cache cap is exceeded", () => {
    const entries = [
      { url: "http://localhost/ite/learning-materials/c1/m1/read", lastAccessed: 100 },
      { url: "http://localhost/ite/learning-materials/c1/m2/read", lastAccessed: 50 },
      { url: "http://localhost/ite/learning-materials/c1/m3/read", lastAccessed: 200 },
    ];

    const victim = findEvictionCandidate(entries, 2);
    assert.equal(victim, "http://localhost/ite/learning-materials/c1/m2/read");
  });
});

describe("ITE Offline: Submission Drafts & Manila Time", () => {
  it("validates submission draft data correctly", () => {
    const valid = validateSubmissionDraft({
      itemId: "item_123",
      courseId: "course_456",
      userId: "user_789",
      textAnswer: "My assignment response notes",
      links: [{ url: "https://github.com/my-repo", fileName: "Repo" }],
      updatedAt: Date.now(),
    });
    assert.equal(valid.valid, true);

    const invalid = validateSubmissionDraft({
      itemId: "",
      courseId: "course_456",
      userId: "user_789",
      textAnswer: "Notes",
      links: [],
      updatedAt: Date.now(),
    });
    assert.equal(invalid.valid, false);
  });

  it("formats Manila (PHT) time string cleanly", () => {
    // 2026-10-20T04:15:00Z is 12:15 PM in Manila (+08:00)
    const timestamp = new Date("2026-10-20T04:15:00Z").getTime();
    const formatted = formatManilaTime(timestamp);
    assert.ok(formatted.includes("Oct"), `Expected month in ${formatted}`);
    assert.ok(formatted.includes("2026"), `Expected year in ${formatted}`);
  });
});

describe("ITE Offline: Middleware Static Regex", () => {
  it("verifies that /ite-sw.js matches the static extension regex without auth redirection", () => {
    // Exact regex from apps/web/src/middleware.ts: line 7
    const STATIC_EXTENSION_REGEX = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot|webp|json|map|txt|xml|mp4|webm|mp3|wav)$/i;

    assert.equal(STATIC_EXTENSION_REGEX.test("/ite-sw.js"), true);
    assert.equal(STATIC_EXTENSION_REGEX.test("/manifest.json"), true);
    assert.equal(STATIC_EXTENSION_REGEX.test("/favicon.ico"), true);

    // Dynamic pages must NOT match
    assert.equal(STATIC_EXTENSION_REGEX.test("/ite/students"), false);
    assert.equal(STATIC_EXTENSION_REGEX.test("/ite/learning-materials/c1/m1/read"), false);
  });
});

describe("ITE Offline: isRscOrPrefetchRequest", () => {
  it("identifies RSC: 1 header", () => {
    assert.equal(isRscOrPrefetchRequest({ headers: { RSC: "1" } }), true);
    assert.equal(isRscOrPrefetchRequest({ headers: { rsc: "1" } }), true);
  });

  it("identifies router prefetch and state tree headers", () => {
    assert.equal(isRscOrPrefetchRequest({ headers: { "next-router-prefetch": "1" } }), true);
    assert.equal(isRscOrPrefetchRequest({ headers: { "next-router-state-tree": "xyz" } }), true);
  });

  it("identifies _rsc query parameter in URL", () => {
    assert.equal(isRscOrPrefetchRequest({ url: "https://example.com/ite/learning-materials/1/2/read?_rsc=123" }), true);
  });

  it("returns false for regular navigation requests without RSC flags", () => {
    assert.equal(isRscOrPrefetchRequest({ headers: { accept: "text/html" }, url: "https://example.com/ite/learning-materials/1/2/read" }), false);
    assert.equal(isRscOrPrefetchRequest({}), false);
  });
});

describe("ITE Offline: isEligibleOfflineNavigationLink", () => {
  const origin = "https://lms.cdm.edu.ph";

  it("accepts same-origin links within /ite/ student areas", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/learning-materials/c1/m1/read",
        origin,
      }),
      true
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "https://lms.cdm.edu.ph/ite/flashcards",
        origin,
      }),
      true
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/students",
        origin,
      }),
      true
    );
  });

  it("rejects modified clicks (Ctrl, Cmd, Shift, Alt)", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/flashcards",
        origin,
        hasModifierKey: true,
      }),
      false
    );
  });

  it("rejects target=_blank links", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/flashcards",
        origin,
        target: "_blank",
      }),
      false
    );
  });

  it("rejects external origins and non-ITE portals", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "https://google.com/ite/flashcards",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ics/activities",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ibe/classes",
        origin,
      }),
      false
    );
  });

  it("rejects teacher, admin, and API endpoints", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/teachers",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/ite/admin",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "/api/ite/offline/ping",
        origin,
      }),
      false
    );
  });

  it("rejects hash, javascript, and mailto links", () => {
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "#section",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "javascript:void(0)",
        origin,
      }),
      false
    );
    assert.equal(
      isEligibleOfflineNavigationLink({
        href: "mailto:support@cdm.edu.ph",
        origin,
      }),
      false
    );
  });
});

describe("ITE Offline: Review Queue Replay & HTTP Status Handling", () => {
  const mockReview: PendingFlashcardReview = {
    id: "rev_test_123",
    idempotencyKey: "11111111-2222-3333-4444-555555555555",
    deckId: "deck_test_abc",
    cardsReviewed: 10,
    durationSeconds: 120,
    timestamp: 1700000000000,
    retryCount: 0,
    status: "PENDING",
  };

  it("handles 401 (session expired): keeps PENDING, does NOT increment retryCount, stops queue flush, and sets message", () => {
    const decision = classifyReviewSyncResponse(401);
    assert.equal(decision.type, "HOLD_AUTH");
    assert.equal(decision.stopQueue, true);
    assert.equal(decision.message, AUTH_EXPIRED_SYNC_MESSAGE);
    assert.equal(
      decision.message,
      "Sign in again to finish syncing your offline reviews"
    );

    const updated = applyReviewSyncAction(mockReview, decision);
    assert.notEqual(updated, null);
    assert.equal(updated?.status, "PENDING");
    assert.equal(updated?.retryCount, 0, "retryCount must not be incremented on 401");
  });

  it("handles 429 (rate limited): keeps PENDING, does NOT increment retryCount, and stops queue flush", () => {
    const decision = classifyReviewSyncResponse(429);
    assert.equal(decision.type, "HOLD_AUTH");
    assert.equal(decision.stopQueue, true);
    assert.equal(decision.message, AUTH_EXPIRED_SYNC_MESSAGE);

    const updated = applyReviewSyncAction(mockReview, decision);
    assert.notEqual(updated, null);
    assert.equal(updated?.status, "PENDING");
    assert.equal(updated?.retryCount, 0, "retryCount must not be incremented on 429");
  });

  it("handles 408 (request timeout): keeps PENDING, does NOT increment retryCount, and stops queue flush", () => {
    const decision = classifyReviewSyncResponse(408);
    assert.equal(decision.type, "HOLD_AUTH");
    assert.equal(decision.stopQueue, true);
    assert.equal(decision.message, AUTH_EXPIRED_SYNC_MESSAGE);

    const updated = applyReviewSyncAction(mockReview, decision);
    assert.notEqual(updated, null);
    assert.equal(updated?.status, "PENDING");
    assert.equal(updated?.retryCount, 0, "retryCount must not be incremented on 408");
  });

  it("handles 403 (forbidden): marks for removal as unusable client error", () => {
    const decision = classifyReviewSyncResponse(403);
    assert.equal(decision.type, "REMOVE_CLIENT_ERROR");
    assert.equal(decision.stopQueue, false);

    const updated = applyReviewSyncAction(mockReview, decision);
    assert.equal(updated, null, "Item should be removed from IndexedDB on 403");
  });

  it("handles 404, 422, and other 4xx errors: marks for removal as unusable client errors", () => {
    for (const code of [400, 404, 422]) {
      const decision = classifyReviewSyncResponse(code);
      assert.equal(decision.type, "REMOVE_CLIENT_ERROR");
      assert.equal(decision.stopQueue, false);

      const updated = applyReviewSyncAction(mockReview, decision);
      assert.equal(updated, null, `Item should be removed from IndexedDB on ${code}`);
    }
  });

  it("handles 5xx server errors: increments retryCount and keeps PENDING when below max retries", () => {
    for (const code of [500, 502, 503, 504]) {
      const decision = classifyReviewSyncResponse(code);
      assert.equal(decision.type, "RETRY_SERVER_ERROR");
      assert.equal(decision.stopQueue, false);

      const updated = applyReviewSyncAction(mockReview, decision);
      assert.notEqual(updated, null);
      assert.equal(updated?.retryCount, 1, `retryCount should increment on ${code}`);
      assert.equal(updated?.status, "PENDING");
    }
  });

  it("handles 5xx server errors: transitions status to FAILED when retry ceiling is reached", () => {
    const almostFailedItem: PendingFlashcardReview = {
      ...mockReview,
      retryCount: MAX_RETRY_ATTEMPTS - 1,
    };

    const decision = classifyReviewSyncResponse(500);
    const updated = applyReviewSyncAction(almostFailedItem, decision);
    assert.notEqual(updated, null);
    assert.equal(updated?.retryCount, MAX_RETRY_ATTEMPTS);
    assert.equal(updated?.status, "FAILED", "Item status must transition to FAILED when retry limit reached");
  });

  it("handles 200/201 success: marks item for removal from queue", () => {
    for (const code of [200, 201]) {
      const decision = classifyReviewSyncResponse(code);
      assert.equal(decision.type, "SUCCESS");
      assert.equal(decision.stopQueue, false);

      const updated = applyReviewSyncAction(mockReview, decision);
      assert.equal(updated, null, `Successful response ${code} should remove item`);
    }
  });
});


