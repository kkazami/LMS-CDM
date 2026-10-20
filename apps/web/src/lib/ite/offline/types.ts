/**
 * apps/web/src/lib/ite/offline/types.ts
 *
 * Types for ITE Offline Access & Auto Sync.
 */

export interface PendingFlashcardReview {
  id: string; // Internal queue ID
  idempotencyKey: string; // UUID sent to server
  deckId: string;
  cardsReviewed: number;
  durationSeconds: number;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: "PENDING" | "SYNCING" | "FAILED";
}

export interface SubmissionDraftLink {
  url: string;
  fileName: string;
}

export interface SubmissionDraft {
  itemId: string;
  courseId: string;
  userId: string;
  text: string;
  links: SubmissionDraftLink[];
  updatedAt: number; // Unix timestamp
  manilaUpdatedAt: string; // Formatted date string in Asia/Manila
}

export interface CachedDeckPayload {
  deckId: string;
  userId: string;
  cards: unknown[];
  stats?: unknown;
  cachedAt: number;
}

export interface OfflineStatusState {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  hasIndexedDb: boolean;
  isIteStudent: boolean;
}

export interface OfflineActor {
  userId: string;
  role: string;
  instituteCode: string;
}
