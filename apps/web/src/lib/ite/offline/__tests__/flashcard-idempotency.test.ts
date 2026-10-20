/**
 * apps/web/src/lib/ite/offline/__tests__/flashcard-idempotency.test.ts
 *
 * Unit tests for DB-backed flashcard offline-sync duplicate protection:
 * - Client key validation (UUID format, max 64 characters, safe namespacing)
 * - First call grants EXP and logs activity
 * - Second call with the same key grants 0 EXP, returns duplicate: true, and logs no second activity
 * - Concurrent race condition detection inside grantExp
 * - Different key grants EXP and logs activity
 * - Request with no key behaves as before
 * - Request with invalid key ignores the key and behaves as before
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isValidIdempotencyKey,
  formatNamespacedIdempotencyKey,
} from "../pure-logic";

import { processCompleteSession } from "../flashcard-complete";
import type { GrantExpArgs, GrantExpResult } from "@/lib/gamification/grant-exp";

describe("Flashcard Idempotency: Key Validation", () => {
  it("accepts valid RFC4122 UUIDs of standard length", () => {
    assert.equal(isValidIdempotencyKey("123e4567-e89b-12d3-a456-426614174000"), true);
    assert.equal(isValidIdempotencyKey("c56a4180-65aa-42ec-a945-5fd21dec0538"), true);
    assert.equal(isValidIdempotencyKey("C56A4180-65AA-42EC-A945-5FD21DEC0538"), true); // uppercase valid
  });

  it("trims whitespace around a valid UUID", () => {
    assert.equal(isValidIdempotencyKey("  123e4567-e89b-12d3-a456-426614174000  "), true);
  });

  it("rejects non-string inputs", () => {
    assert.equal(isValidIdempotencyKey(null), false);
    assert.equal(isValidIdempotencyKey(undefined), false);
    assert.equal(isValidIdempotencyKey(12345), false);
    assert.equal(isValidIdempotencyKey({}), false);
  });

  it("rejects empty, whitespace-only, or over-long strings", () => {
    assert.equal(isValidIdempotencyKey(""), false);
    assert.equal(isValidIdempotencyKey("   "), false);
    // Over 64 characters
    const longString = "123e4567-e89b-12d3-a456-426614174000" + "x".repeat(30);
    assert.equal(isValidIdempotencyKey(longString), false);
  });

  it("rejects malformed strings, arbitrary text, and injection attempts", () => {
    assert.equal(isValidIdempotencyKey("not-a-uuid"), false);
    assert.equal(isValidIdempotencyKey("123e4567e89b12d3a456426614174000"), false); // missing hyphens
    assert.equal(isValidIdempotencyKey("123e4567-e89b-12d3-a456-426614174000; DROP TABLE users;"), false);
    assert.equal(isValidIdempotencyKey("../../../etc/passwd"), false);
  });

  it("formats namespaced idempotency key correctly (fc:<userId>:<clientKey>)", () => {
    const formatted = formatNamespacedIdempotencyKey(
      "user_abc",
      "123e4567-e89b-12d3-a456-426614174000"
    );
    assert.equal(formatted, "fc:user_abc:123e4567-e89b-12d3-a456-426614174000");
  });

  it("returns null when formatting with empty userId or invalid client key", () => {
    assert.equal(formatNamespacedIdempotencyKey("", "123e4567-e89b-12d3-a456-426614174000"), null);
    assert.equal(formatNamespacedIdempotencyKey("user_abc", "invalid-key"), null);
    assert.equal(formatNamespacedIdempotencyKey("user_abc", null), null);
  });
});

describe("Flashcard Idempotency: Duplicate Path & Mocked DB", () => {
  const dummyDeck = {
    id: "deck_123",
    title: "Lesson 1: Educational Psychology",
    courseId: "course_789",
  };

  it("first call with key grants EXP and logs activity", async () => {
    const transactionsInDb = new Map<string, string>(); // namespacedKey -> txId
    let grantExpCalls = 0;
    let logActivityCalls = 0;
    let passedIdempotencyKeyToGrant: string | undefined = undefined;

    const mockFindDeck = async () => dummyDeck;
    const mockFindExistingTx = async (_uid: string, key: string) => {
      const id = transactionsInDb.get(key);
      return id ? { id } : null;
    };
    const mockGrantExp = async (args: GrantExpArgs): Promise<GrantExpResult> => {
      grantExpCalls++;
      passedIdempotencyKeyToGrant = args.idempotencyKey;
      const txId = `tx_${Date.now()}`;
      if (args.idempotencyKey) {
        transactionsInDb.set(args.idempotencyKey, txId);
      }
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 50,
        transactionId: txId,
        grantedAmount: 50,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const clientUuid = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 10,
      durationSeconds: 60,
      idempotencyKey: clientUuid,
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.grantedExp, 50);
    assert.equal(res.body.duplicate, undefined);
    assert.equal(grantExpCalls, 1);
    assert.equal(logActivityCalls, 1);
    assert.equal(passedIdempotencyKeyToGrant, `fc:student_1:${clientUuid}`);
  });

  it("second call with the same key grants 0 EXP, returns duplicate: true, and logs no second activity", async () => {
    const clientUuid = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
    const namespacedKey = `fc:student_1:${clientUuid}`;

    // DB already contains the transaction from the first call
    const transactionsInDb = new Map<string, string>([
      [namespacedKey, "tx_existing_999"],
    ]);
    let grantExpCalls = 0;
    let logActivityCalls = 0;

    const mockFindDeck = async () => dummyDeck;
    const mockFindExistingTx = async (_uid: string, key: string) => {
      const id = transactionsInDb.get(key);
      return id ? { id } : null;
    };
    const mockGrantExp = async (_args: GrantExpArgs): Promise<GrantExpResult> => {
      grantExpCalls++;
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 50,
        transactionId: "",
        grantedAmount: 0,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 10,
      durationSeconds: 60,
      idempotencyKey: clientUuid,
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.grantedExp, 0);
    assert.equal(res.body.duplicate, true);
    assert.equal(grantExpCalls, 0, "grantExp must not be invoked on replay");
    assert.equal(logActivityCalls, 0, "logActivity must not be called on replay");
    assert.equal(res.shouldLogActivity, false);
  });

  it("concurrent replay caught by grantExp transaction grants 0 and logs no activity", async () => {
    let logActivityCalls = 0;
    const clientUuid = "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e";

    const mockFindDeck = async () => dummyDeck;
    // Simulate race: findExistingTx returns null initially
    const mockFindExistingTx = async () => null;

    // Inside grantExp, existing transaction is detected atomically
    const mockGrantExp = async (_args: GrantExpArgs): Promise<GrantExpResult> => {
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 50,
        transactionId: "tx_race_detected_123",
        grantedAmount: 0,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 10,
      durationSeconds: 60,
      idempotencyKey: clientUuid,
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.grantedExp, 0);
    assert.equal(res.body.duplicate, true);
    assert.equal(logActivityCalls, 0);
    assert.equal(res.shouldLogActivity, false);
  });

  it("a different key grants EXP and logs activity", async () => {
    let grantExpCalls = 0;
    let logActivityCalls = 0;
    const transactionsInDb = new Map<string, string>([
      ["fc:student_1:old-uuid-already-used-1234567890ab", "tx_1"],
    ]);

    const newUuid = "f1e2d3c4-b5a6-4f1e-8d2c-3b4a5f6e7d8c";

    const mockFindDeck = async () => dummyDeck;
    const mockFindExistingTx = async (_uid: string, key: string) => {
      const id = transactionsInDb.get(key);
      return id ? { id } : null;
    };
    const mockGrantExp = async (args: GrantExpArgs): Promise<GrantExpResult> => {
      grantExpCalls++;
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 100,
        transactionId: "tx_new",
        grantedAmount: 50,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 5,
      durationSeconds: 30,
      idempotencyKey: newUuid,
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.grantedExp, 50);
    assert.equal(res.body.duplicate, undefined);
    assert.equal(grantExpCalls, 1);
    assert.equal(logActivityCalls, 1);
  });

  it("requests with no key behave exactly as before", async () => {
    let findExistingTxCalls = 0;
    let grantExpCalls = 0;
    let logActivityCalls = 0;
    let passedKey: string | undefined = "sentinel";

    const mockFindDeck = async () => dummyDeck;
    const mockFindExistingTx = async () => {
      findExistingTxCalls++;
      return null;
    };
    const mockGrantExp = async (args: GrantExpArgs): Promise<GrantExpResult> => {
      grantExpCalls++;
      passedKey = args.idempotencyKey;
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 50,
        transactionId: "tx_no_key",
        grantedAmount: 50,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 5,
      durationSeconds: 30,
      idempotencyKey: undefined,
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.grantedExp, 50);
    assert.equal(res.body.duplicate, undefined);
    assert.equal(findExistingTxCalls, 0, "findExistingTx must not be called when no key provided");
    assert.equal(grantExpCalls, 1);
    assert.equal(passedKey, undefined, "grantExp must receive undefined idempotencyKey");
    assert.equal(logActivityCalls, 1);
  });

  it("requests with an invalid key ignore the key and behave as before", async () => {
    let findExistingTxCalls = 0;
    let grantExpCalls = 0;
    let logActivityCalls = 0;
    let passedKey: string | undefined = "sentinel";

    const mockFindDeck = async () => dummyDeck;
    const mockFindExistingTx = async () => {
      findExistingTxCalls++;
      return null;
    };
    const mockGrantExp = async (args: GrantExpArgs): Promise<GrantExpResult> => {
      grantExpCalls++;
      passedKey = args.idempotencyKey;
      return {
        previousLevel: 1,
        newLevel: 1,
        leveledUp: false,
        newExp: 50,
        transactionId: "tx_invalid_key",
        grantedAmount: 50,
      };
    };
    const mockLogActivity = async () => {
      logActivityCalls++;
    };

    const res = await processCompleteSession({
      userId: "student_1",
      deckId: "deck_123",
      cardsReviewed: 5,
      durationSeconds: 30,
      idempotencyKey: "malformed-not-a-uuid-string-12345",
      deps: {
        findDeck: mockFindDeck,
        findExistingTx: mockFindExistingTx,
        grantExp: mockGrantExp,
        logActivity: mockLogActivity,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.grantedExp, 50);
    assert.equal(res.body.duplicate, undefined);
    assert.equal(findExistingTxCalls, 0, "findExistingTx must not be called when key is invalid");
    assert.equal(grantExpCalls, 1);
    assert.equal(passedKey, undefined, "grantExp must receive undefined when key is invalid");
    assert.equal(logActivityCalls, 1);
  });
});
