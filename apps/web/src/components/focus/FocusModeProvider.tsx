/**
 * apps/web/src/components/focus/FocusModeProvider.tsx
 *
 * Primary context provider for ITE Focus Mode (distraction-free learning).
 * Mounted ONLY for ITE students in DashboardLayout.
 */

"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  FocusModeContext,
  type FocusModeContextValue,
  type StartFocusOptions,
} from "./FocusModeContext";
import FocusFloatingBar from "./FocusFloatingBar";
import FocusStartDialog from "./FocusStartDialog";
import FocusCompletionModal from "./FocusCompletionModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { toast, setFocusModeToastSuppression } from "@/components/common/Toast";
import type { FocusContextType } from "@/lib/ite/focus/types";

const SESSION_STORAGE_KEY = "ite_focus_session_state";

interface PersistedState {
  sessionId: string;
  contextType: FocusContextType;
  courseId: string | null;
  refId: string | null;
  plannedMinutes: number | null;
  startedAtIso: string;
}

export default function FocusModeProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextType, setContextType] = useState<FocusContextType | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [plannedMinutes, setPlannedMinutes] = useState<number | null>(null);
  const [elapsedFocusedSeconds, setElapsedFocusedSeconds] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [awayNotice, setAwayNotice] = useState<string | null>(null);

  // Dialog states
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<{
    contextType: FocusContextType;
    courseId?: string | null;
    refId?: string | null;
    title?: string;
  } | null>(null);
  const [isEarlyExitConfirmOpen, setIsEarlyExitConfirmOpen] = useState(false);
  const [isGoalReachedModalOpen, setIsGoalReachedModalOpen] = useState(false);

  // Refs for tracking across async intervals and event listeners
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const elapsedSecondsRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const plannedMinutesRef = useRef<number | null>(null);
  const isAwayRef = useRef(false);
  const lastSwitchTimeRef = useRef(0);
  const goalReachedHandledRef = useRef(false);

  // Keep refs synchronized
  useEffect(() => {
    isActiveRef.current = isActive;
    isPausedRef.current = isPaused;
    sessionIdRef.current = sessionId;
    elapsedSecondsRef.current = elapsedFocusedSeconds;
    tabSwitchCountRef.current = tabSwitchCount;
    plannedMinutesRef.current = plannedMinutes;
  }, [isActive, isPaused, sessionId, elapsedFocusedSeconds, tabSwitchCount, plannedMinutes]);

  // Check sessionStorage on initial mount to resume an ACTIVE session on full reload
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as PersistedState & { focusedSeconds?: number; tabSwitchCount?: number };
      if (!data?.sessionId) return;

      // Verify with backend that this session is still active
      fetch(`/api/ite/focus/sessions/${data.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      })
        .then(async (res) => {
          if (!res.ok) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return;
          }

          const json = await res.json().catch(() => null);
          const session = json?.session;
          if (!session || session.status !== "ACTIVE") {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return;
          }

          // Resume active session
          setSessionId(data.sessionId);
          setContextType(data.contextType);
          setCourseId(data.courseId ?? null);
          setRefId(data.refId ?? null);
          setPlannedMinutes(data.plannedMinutes ?? null);
          setElapsedFocusedSeconds(session.focusedSeconds ?? data.focusedSeconds ?? 0);
          setTabSwitchCount(session.tabSwitchCount ?? data.tabSwitchCount ?? 0);
          setIsPaused(false);
          setIsActive(true);
        })
        .catch((err) => {
          console.warn("[FocusMode] Error verifying active session on mount:", err);
        });
    } catch (err) {
      console.warn("[FocusMode] Error reading sessionStorage on mount:", err);
    }
  }, []);

  // Set / remove data-focus-mode on documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isActive) {
      document.documentElement.setAttribute("data-focus-mode", "on");
      setFocusModeToastSuppression(true);
    } else {
      document.documentElement.removeAttribute("data-focus-mode");
      const queuedCount = setFocusModeToastSuppression(false);
      if (queuedCount > 0) {
        toast.info(
          "Focus session ended",
          `You received ${queuedCount} notification${queuedCount > 1 ? "s" : ""} while focused.`
        );
      }
    }

    return () => {
      document.documentElement.removeAttribute("data-focus-mode");
    };
  }, [isActive]);

  // Listen for fullscreenchange events (e.g. user presses Esc to exit browser fullscreen)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // 1-second timer loop while active and not paused
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      setElapsedFocusedSeconds((prev) => {
        const next = prev + 1;
        elapsedSecondsRef.current = next;

        // Check for planned goal reach
        if (
          plannedMinutesRef.current &&
          next >= plannedMinutesRef.current * 60 &&
          !goalReachedHandledRef.current
        ) {
          goalReachedHandledRef.current = true;
          setIsGoalReachedModalOpen(true);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // 30-second heartbeat to backend
  useEffect(() => {
    if (!isActive || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        await fetch(`/api/ite/focus/sessions/${sessionIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "heartbeat",
            focusedSeconds: elapsedSecondsRef.current,
            tabSwitchCount: tabSwitchCountRef.current,
          }),
        });

        // Sync latest progress to sessionStorage for full-reload survival
        try {
          const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (raw) {
            const current = JSON.parse(raw);
            current.focusedSeconds = elapsedSecondsRef.current;
            current.tabSwitchCount = tabSwitchCountRef.current;
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(current));
          }
        } catch {}
      } catch (err) {
        // Keep local timer running; retry next heartbeat
        console.warn("[FocusMode] Heartbeat retry scheduled", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isActive, sessionId]);

  // Distraction detection via visibilitychange and blur / focus
  useEffect(() => {
    if (!isActive) return;

    const handleLeave = () => {
      if (!isActiveRef.current) return;
      const now = Date.now();

      // Debounce tab switch counting to avoid double-counting blur + visibilitychange
      if (!isAwayRef.current) {
        isAwayRef.current = true;
        setIsPaused(true);

        if (now - lastSwitchTimeRef.current > 1200) {
          lastSwitchTimeRef.current = now;
          setTabSwitchCount((c) => {
            const next = c + 1;
            tabSwitchCountRef.current = next;
            return next;
          });
        }
      }
    };

    const handleReturn = () => {
      if (!isActiveRef.current) return;

      if (isAwayRef.current) {
        isAwayRef.current = false;
        setIsPaused(false);

        const currentCount = tabSwitchCountRef.current;
        const notice = `Welcome back. You stepped away ${currentCount} time${currentCount === 1 ? "" : "s"} this session.`;
        setAwayNotice(notice);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleLeave();
      } else if (document.visibilityState === "visible") {
        handleReturn();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", handleReturn);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", handleReturn);
    };
  }, [isActive]);

  // sendBeacon on pagehide / beforeunload
  useEffect(() => {
    if (!isActive || !sessionId) return;

    const handleUnload = () => {
      if (!sessionIdRef.current) return;
      const payload = JSON.stringify({
        action: "heartbeat",
        focusedSeconds: elapsedSecondsRef.current,
        tabSwitchCount: tabSwitchCountRef.current,
      });

      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "text/plain" });
        navigator.sendBeacon(`/api/ite/focus/sessions/${sessionIdRef.current}`, blob);
      }
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [isActive, sessionId]);

  // Alt+Shift+F global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside text fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.altKey && e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        if (isActiveRef.current) {
          setIsEarlyExitConfirmOpen(true);
        } else {
          setIsStartDialogOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Open / Close start dialog
  const openStartDialog = useCallback((opts?: {
    contextType?: FocusContextType;
    courseId?: string | null;
    refId?: string | null;
    title?: string;
  }) => {
    setDialogContext({
      contextType: opts?.contextType || "STUDY",
      courseId: opts?.courseId || null,
      refId: opts?.refId || null,
      title: opts?.title,
    });
    setIsStartDialogOpen(true);
  }, []);

  const closeStartDialog = useCallback(() => {
    setIsStartDialogOpen(false);
    setDialogContext(null);
  }, []);

  // Start Focus Session
  const startSession = useCallback(async (options: StartFocusOptions) => {
    try {
      const res = await fetch("/api/ite/focus/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: options.contextType,
          courseId: options.courseId || null,
          refId: options.refId || null,
          plannedMinutes: options.plannedMinutes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to start session (${res.status})`);
      }

      const { session } = (await res.json()) as { session: { id: string } };

      setSessionId(session.id);
      setContextType(options.contextType);
      setCourseId(options.courseId || null);
      setRefId(options.refId || null);
      setPlannedMinutes(options.plannedMinutes || null);
      setElapsedFocusedSeconds(0);
      setTabSwitchCount(0);
      setIsPaused(false);
      setIsActive(true);
      goalReachedHandledRef.current = false;

      // Request fullscreen if opted
      if (options.requestFullscreen && typeof document !== "undefined" && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.warn("Fullscreen request declined or unsupported:", err);
        }
      }

      // Save state to sessionStorage
      try {
        const state: PersistedState = {
          sessionId: session.id,
          contextType: options.contextType,
          courseId: options.courseId || null,
          refId: options.refId || null,
          plannedMinutes: options.plannedMinutes || null,
          startedAtIso: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
      } catch {}

      toast.success(
        "Focus Mode started",
        options.plannedMinutes
          ? `${options.plannedMinutes} min timer set. In-app distractions hidden.`
          : "Open focus session started. In-app distractions hidden."
      );
    } catch (err) {
      console.error("Start focus session error:", err);
      toast.error("Could not start Focus Mode", err instanceof Error ? err.message : "Network error");
      throw err;
    }
  }, []);

  // End Focus Session
  const endSession = useCallback(async (confirmIfEarly = false) => {
    // If confirmation is required when less than 80% time elapsed or no timer set:
    if (confirmIfEarly) {
      const planned = plannedMinutesRef.current;
      const elapsed = elapsedSecondsRef.current;
      const isEarly = planned ? elapsed < planned * 60 * 0.8 : true;

      if (isEarly) {
        setIsEarlyExitConfirmOpen(true);
        return;
      }
    }

    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      setIsActive(false);
      return;
    }

    try {
      await fetch(`/api/ite/focus/sessions/${currentSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          focusedSeconds: elapsedSecondsRef.current,
          tabSwitchCount: tabSwitchCountRef.current,
        }),
      });
    } catch (err) {
      console.warn("Failed to notify backend of session end:", err);
    } finally {
      setIsActive(false);
      setSessionId(null);
      setIsEarlyExitConfirmOpen(false);
      setIsGoalReachedModalOpen(false);

      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
    }
  }, []);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  }, []);

  // Keep going from goal completion
  const handleKeepGoing = useCallback(() => {
    setIsGoalReachedModalOpen(false);
    // Add 15 minutes to planned minutes
    setPlannedMinutes((prev) => (prev ? prev + 15 : 15));
    goalReachedHandledRef.current = false;
  }, []);

  const contextValue: FocusModeContextValue = {
    isActive,
    sessionId,
    contextType,
    courseId,
    refId,
    elapsedFocusedSeconds,
    plannedMinutes,
    tabSwitchCount,
    isPaused,
    isFullscreen,
    awayNotice,
    isStartDialogOpen,
    dialogContext,
    openStartDialog,
    closeStartDialog,
    startSession,
    endSession,
    toggleFullscreen,
  };

  return (
    <FocusModeContext.Provider value={contextValue}>
      {children}

      {/* Floating Active Focus Bar */}
      <FocusFloatingBar />

      {/* Start Focus Dialog */}
      <FocusStartDialog />

      {/* Goal Reached Completion Modal */}
      {plannedMinutes && (
        <FocusCompletionModal
          isOpen={isGoalReachedModalOpen}
          plannedMinutes={plannedMinutes}
          elapsedSeconds={elapsedFocusedSeconds}
          tabSwitchCount={tabSwitchCount}
          onTakeBreak={() => endSession(false)}
          onKeepGoing={handleKeepGoing}
        />
      )}

      {/* Early Exit Confirmation Dialog */}
      {isEarlyExitConfirmOpen && (
        <ConfirmDialog
          title="Exit Focus Mode early?"
          description="You haven't reached your focus goal yet. Exiting now will mark this session as completed with your current focused time."
          onClose={() => setIsEarlyExitConfirmOpen(false)}
        >
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEarlyExitConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Keep Focusing
            </button>
            <button
              type="button"
              onClick={() => endSession(false)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Exit Now
            </button>
          </div>
        </ConfirmDialog>
      )}
    </FocusModeContext.Provider>
  );
}
