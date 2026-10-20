/**
 * apps/web/src/lib/ite/offline/idb.ts
 *
 * Raw IndexedDB wrapper for ITE student offline data.
 * Pure native browser IndexedDB, zero external dependencies.
 * Fails safely if IndexedDB is unavailable (private browsing, quotas).
 */

import { getUserDbName } from "./pure-logic";
import type {
  PendingFlashcardReview,
  SubmissionDraft,
  CachedDeckPayload,
} from "./types";

const DB_VERSION = 1;
const STORE_REVIEWS = "flashcardReviews";
const STORE_DRAFTS = "submissionDrafts";
const STORE_DECKS = "flashcardDecks";
const STORE_META = "meta";

/**
 * Checks if IndexedDB is supported in the current environment.
 */
export function isIndexedDbSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

/**
 * Opens or upgrades the user's IndexedDB database.
 */
function openDb(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const dbName = getUserDbName(userId);
    const request = window.indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const store = db.createObjectStore(STORE_REVIEWS, { keyPath: "id" });
        store.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "itemId" });
      }

      if (!db.objectStoreNames.contains(STORE_DECKS)) {
        db.createObjectStore(STORE_DECKS, { keyPath: "deckId" });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Flashcard Reviews Queue ────────────────────────────────────────────────

export async function getPendingFlashcardReviews(userId: string): Promise<PendingFlashcardReview[]> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REVIEWS, "readonly");
      const store = tx.objectStore(STORE_REVIEWS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to get pending reviews:", err);
    return [];
  }
}

export async function savePendingFlashcardReview(
  userId: string,
  review: PendingFlashcardReview
): Promise<boolean> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REVIEWS, "readwrite");
      const store = tx.objectStore(STORE_REVIEWS);
      const req = store.put(review);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to save pending review:", err);
    return false;
  }
}

export async function removePendingFlashcardReview(userId: string, id: string): Promise<boolean> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REVIEWS, "readwrite");
      const store = tx.objectStore(STORE_REVIEWS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to remove review:", err);
    return false;
  }
}

// ─── Submission Drafts ──────────────────────────────────────────────────────

export async function getSubmissionDraft(
  userId: string,
  itemId: string
): Promise<SubmissionDraft | null> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.get(itemId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to get draft:", err);
    return null;
  }
}

export async function saveSubmissionDraft(
  userId: string,
  draft: SubmissionDraft
): Promise<boolean> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.put(draft);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to save draft:", err);
    return false;
  }
}

export async function deleteSubmissionDraft(userId: string, itemId: string): Promise<boolean> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.delete(itemId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to delete draft:", err);
    return false;
  }
}

// ─── Cached Flashcard Decks ─────────────────────────────────────────────────

export async function getCachedDeck(
  userId: string,
  deckId: string
): Promise<CachedDeckPayload | null> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DECKS, "readonly");
      const store = tx.objectStore(STORE_DECKS);
      const req = store.get(deckId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to get cached deck:", err);
    return null;
  }
}

export async function saveCachedDeck(
  userId: string,
  payload: CachedDeckPayload
): Promise<boolean> {
  try {
    const db = await openDb(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DECKS, "readwrite");
      const store = tx.objectStore(STORE_DECKS);
      const req = store.put(payload);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ITE Offline IDB] Failed to cache deck:", err);
    return false;
  }
}

// ─── Cleanup / Sign-out Deletion ────────────────────────────────────────────

/**
 * Deletes the specific user's IndexedDB database.
 */
export async function deleteUserDatabase(userId: string): Promise<boolean> {
  if (!isIndexedDbSupported()) return true;
  return new Promise((resolve) => {
    try {
      const dbName = getUserDbName(userId);
      const req = window.indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Clears ALL offline caches and databases created by this feature on signout or loss of eligibility.
 */
export async function clearAllOfflineData(userId?: string): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Message Service Worker to delete its caches
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL" });
    }
  } catch {}

  // 2. Unregister service workers under /ite/
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.scope.includes("/ite") || reg.active?.scriptURL.includes("ite-sw.js")) {
          await reg.unregister();
        }
      }
    }
  } catch {}

  // 3. Delete CacheStorage caches with our prefix
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith("ite-offline-")) {
          await caches.delete(key);
        }
      }
    }
  } catch {}

  // 4. Delete user's IndexedDB database
  if (userId) {
    await deleteUserDatabase(userId);
  }
}
