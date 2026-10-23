"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { OfflineContext } from "./useOfflineStatus";
import {
  isIndexedDbSupported,
  getPendingFlashcardReviews,
  removePendingFlashcardReview,
  savePendingFlashcardReview,
  clearAllOfflineData,
} from "@/lib/ite/offline/idb";
import {
  MAX_RETRY_ATTEMPTS,
  isEligibleOfflineNavigationLink,
  classifyReviewSyncResponse,
  applyReviewSyncAction,
  AUTH_EXPIRED_SYNC_MESSAGE,
  SYNC_PAUSED_MESSAGE,
} from "@/lib/ite/offline/pure-logic";

interface OfflineBootstrapProps {
  userId?: string;
  isEligible?: boolean;
  children: React.ReactNode;
}

export default function OfflineBootstrap({
  userId,
  isEligible = false,
  children,
}: OfflineBootstrapProps) {
  const [online, setOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [hasIndexedDb, setHasIndexedDb] = useState<boolean>(true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const isSyncingRef = useRef(false);
  const consecutivePingFailuresRef = useRef(0);

  // 1. Initial IndexedDB check
  useEffect(() => {
    setHasIndexedDb(isIndexedDbSupported());
  }, []);

  // 2. Refresh pending items count
  const refreshPendingCount = useCallback(async (): Promise<number> => {
    if (!userId || !isEligible || !isIndexedDbSupported()) return 0;
    try {
      const pending = await getPendingFlashcardReviews(userId);
      setPendingCount(pending.length);
      return pending.length;
    } catch {
      return 0;
    }
  }, [userId, isEligible]);

  // 3. Queue Sync Function
  const syncNow = useCallback(async () => {
    if (!userId || !isEligible || !navigator.onLine || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const reviews = await getPendingFlashcardReviews(userId);
      if (reviews.length === 0) {
        setPendingCount(0);
        setSyncNotice(null);
        return;
      }

      let hitAuthHold = false;

      for (const item of reviews) {
        if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
          // Keep in queue with FAILED status so user can see it
          continue;
        }

        try {
          const res = await fetch("/api/flashcards/complete-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deckId: item.deckId,
              cardsReviewed: item.cardsReviewed,
              durationSeconds: item.durationSeconds,
              idempotencyKey: item.idempotencyKey,
            }),
          });

          const action = classifyReviewSyncResponse(res.status);

          if (action.type === "SUCCESS") {
            await removePendingFlashcardReview(userId, item.id);
          } else if (action.type === "HOLD_AUTH") {
            // 401 (and 408, 429): keep the item as PENDING, do NOT increment retryCount,
            // stop flushing the rest of the queue for this run,
            // and set a visible state telling the student "Sign in again to finish syncing your offline reviews".
            hitAuthHold = true;
            const updated = applyReviewSyncAction(item, action);
            if (updated) {
              await savePendingFlashcardReview(userId, updated);
            }
            setSyncNotice(action.message || AUTH_EXPIRED_SYNC_MESSAGE);
            break;
          } else if (action.type === "REMOVE_CLIENT_ERROR") {
            // 403/404/422 and other 4xx: remove unusable review
            await removePendingFlashcardReview(userId, item.id);
          } else {
            // 5xx and other server errors: record retry
            const updated = applyReviewSyncAction(item, action);
            if (updated) {
              item.retryCount = updated.retryCount;
              item.status = updated.status;
              await savePendingFlashcardReview(userId, updated);
            }
          }
        } catch {
          // Network failed mid-sync: halt loop until next reconnect
          break;
        }
      }

      if (!hitAuthHold) {
        setSyncNotice(null);
      }

      const remaining = await getPendingFlashcardReviews(userId);
      setPendingCount(remaining.length);
      setLastSyncedAt(Date.now());
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [userId, isEligible]);

  // 4. Connectivity Verification via Ping Endpoint
  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }

    try {
      const res = await fetch("/api/ite/offline/ping", {
        method: "GET",
        cache: "no-store",
      });

      if (res.status === 204) {
        consecutivePingFailuresRef.current = 0;
        setOnline(true);
      } else {
        consecutivePingFailuresRef.current += 1;
        if (consecutivePingFailuresRef.current >= 2) {
          setOnline(false);
        }
      }
    } catch {
      consecutivePingFailuresRef.current += 1;
      if (consecutivePingFailuresRef.current >= 2) {
        setOnline(false);
      }
    }
  }, []);

  // 5. Registration & Event Listeners
  useEffect(() => {
    if (!isEligible) {
      // Non-eligible user: purge any existing offline cache & unregister
      clearAllOfflineData(userId).catch(() => {});
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register service worker with /ite/ scope
    navigator.serviceWorker
      .register("/ite-sw.js", { scope: "/ite/" })
      .then((reg) => {
        // Send user ID to active worker for namespacing
        if (reg.active && userId) {
          reg.active.postMessage({ type: "SET_USER", userId });
        }
      })
      .catch((err) => {
        console.warn("[ITE Offline] Service worker registration failed:", err);
      });

    // Pass user ID once worker becomes active
    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller && userId) {
        navigator.serviceWorker.controller.postMessage({ type: "SET_USER", userId });
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Initial status check & pending count
    checkConnectivity();
    refreshPendingCount().then((count) => {
      if (count > 0) {
        syncNow();
      }
    });

    // Browser Online/Offline Events
    const handleOnline = () => {
      checkConnectivity().then(() => {
        syncNow();
      });
    };

    const handleOffline = () => {
      setOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkConnectivity().then(() => {
          refreshPendingCount();
          syncNow();
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic connectivity ping every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      clearInterval(interval);
    };
  }, [isEligible, userId, checkConnectivity, refreshPendingCount, syncNow]);

  // 6. Capture-phase link click interception when offline for ITE students
  useEffect(() => {
    if (!isEligible || online) {
      return;
    }

    const handleClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      const isEligibleLink = isEligibleOfflineNavigationLink({
        href: rawHref,
        origin: window.location.origin,
        target: anchor.getAttribute("target"),
        hasModifierKey: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
      });

      if (isEligibleLink) {
        event.preventDefault();
        window.location.assign(anchor.href);
      }
    };

    document.addEventListener("click", handleClickCapture, true);
    return () => {
      document.removeEventListener("click", handleClickCapture, true);
    };
  }, [isEligible, online]);

  return (
    <OfflineContext.Provider
      value={{
        online,
        pendingCount,
        syncing,
        lastSyncedAt,
        hasIndexedDb,
        isIteStudent: isEligible,
        userId,
        syncNow,
        refreshPendingCount,
        syncNotice,
      }}
    >
      {syncNotice && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950 px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md border-b border-amber-600/20 sticky top-0 z-50 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-xs px-2.5 py-1 rounded bg-black/10 hover:bg-black/20 font-medium shrink-0 transition-colors"
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </OfflineContext.Provider>
  );
}
