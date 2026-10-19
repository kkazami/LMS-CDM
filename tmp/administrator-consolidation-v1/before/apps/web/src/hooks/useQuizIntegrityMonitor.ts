"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { IntegrityToastData } from "@/components/courses/IntegrityFeedbackToast";

export interface UseQuizIntegrityMonitorOptions {
  syllabusItemId: string;
  submissionId?: string | null;
  enabled: boolean;
  requireFullscreen?: boolean;
  isStudent: boolean;
}

export function useQuizIntegrityMonitor({
  syllabusItemId,
  submissionId,
  enabled,
  requireFullscreen = false,
  isStudent,
}: UseQuizIntegrityMonitorOptions) {
  const [toast, setToast] = useState<IntegrityToastData | null>(null);
  const [loggedEventsCount, setLoggedEventsCount] = useState(0);

  // Fullscreen state tracking
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnteredFullscreenOnce, setHasEnteredFullscreenOnce] = useState(false);
  const [hasExitedFullscreen, setHasExitedFullscreen] = useState(false);
  const hasEnteredFullscreenOnceRef = useRef(false);

  // Timers and throttle tracking
  const blurStartTimeRef = useRef<number | null>(null);
  const lastLoggedRef = useRef<Record<string, number>>({});

  const showToast = useCallback((message: string, eventType: IntegrityToastData["eventType"]) => {
    setToast({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      eventType,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const dismissExitWarning = useCallback(() => {
    setHasExitedFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setHasEnteredFullscreenOnce(true);
      hasEnteredFullscreenOnceRef.current = true;
      setHasExitedFullscreen(false);
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      // Graceful fallback: If browser permissions policy rejects requestFullscreen,
      // allow student to proceed rather than locking them out
      setIsFullscreen(true);
      setHasEnteredFullscreenOnce(true);
      hasEnteredFullscreenOnceRef.current = true;
      setHasExitedFullscreen(false);
    }
  }, []);

  const sendIntegrityEvent = useCallback(
    async (
      eventType: "TAB_SWITCH" | "COPY_PASTE" | "FULLSCREEN_EXIT" | "RIGHT_CLICK",
      severity: "LOW" | "MEDIUM" | "HIGH",
      metadata: Record<string, unknown> = {}
    ) => {
      // Throttle identical events within 1200ms
      const now = Date.now();
      const last = lastLoggedRef.current[eventType] || 0;
      if (now - last < 1200) {
        return;
      }
      lastLoggedRef.current[eventType] = now;

      const payload = {
        syllabusItemId,
        submissionId: submissionId || undefined,
        eventType,
        severity,
        metadata,
      };

      try {
        const jsonStr = JSON.stringify(payload);

        // Attempt sendBeacon first for reliability during unloads / tab switches
        let beaconSent = false;
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          try {
            const blob = new Blob([jsonStr], { type: "application/json" });
            beaconSent = navigator.sendBeacon("/api/integrity/events", blob);
          } catch {
            beaconSent = false;
          }
        }

        if (!beaconSent) {
          await fetch("/api/integrity/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonStr,
            keepalive: true,
          });
        }

        setLoggedEventsCount((prev) => prev + 1);
      } catch (err) {
        console.warn("Could not log integrity event:", err);
      }
    },
    [syllabusItemId, submissionId]
  );

  useEffect(() => {
    if (!enabled || !isStudent || !syllabusItemId) return;

    // 1. Tab Switch & Visibility Change Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartTimeRef.current = Date.now();
      } else {
        const duration = blurStartTimeRef.current
          ? Math.max(1, Math.round((Date.now() - blurStartTimeRef.current) / 1000))
          : 1;
        blurStartTimeRef.current = null;

        sendIntegrityEvent("TAB_SWITCH", "MEDIUM", {
          action: "tab_switch_return",
          durationSeconds: duration,
        });

        showToast("Tab switch detected — this has been logged", "TAB_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      if (!blurStartTimeRef.current) {
        blurStartTimeRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (blurStartTimeRef.current) {
        const duration = Math.max(1, Math.round((Date.now() - blurStartTimeRef.current) / 1000));
        blurStartTimeRef.current = null;

        sendIntegrityEvent("TAB_SWITCH", "MEDIUM", {
          action: "window_focus_return",
          durationSeconds: duration,
        });

        showToast("Window blur detected — this has been logged", "TAB_SWITCH");
      }
    };

    // 2. Copy, Cut, Paste Detection
    const handleClipboard = (e: Event) => {
      const type = e.type as "copy" | "cut" | "paste";
      sendIntegrityEvent("COPY_PASTE", "HIGH", {
        action: type,
        timestamp: new Date().toISOString(),
      });

      const label = type === "paste" ? "Paste attempt" : type === "copy" ? "Copy attempt" : "Cut attempt";
      showToast(`${label} detected — this has been logged`, "COPY_PASTE");
    };

    // 3. Right Click / Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      sendIntegrityEvent("RIGHT_CLICK", "LOW", {
        targetTag: (e.target as HTMLElement)?.tagName || "unknown",
      });

      showToast("Right-click context menu detected — this has been logged", "RIGHT_CLICK");
    };

    // 4. Fullscreen Exit Detection (if required)
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);

      if (requireFullscreen) {
        if (!inFullscreen && hasEnteredFullscreenOnceRef.current) {
          setHasExitedFullscreen(true);

          sendIntegrityEvent("FULLSCREEN_EXIT", "HIGH", {
            action: "fullscreen_exit",
            timestamp: new Date().toISOString(),
          });

          showToast("Fullscreen exit detected — this has been logged", "FULLSCREEN_EXIT");
        } else if (inFullscreen) {
          setHasExitedFullscreen(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("copy", handleClipboard);
    window.addEventListener("cut", handleClipboard);
    window.addEventListener("paste", handleClipboard);
    window.addEventListener("contextmenu", handleContextMenu);

    if (requireFullscreen) {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("copy", handleClipboard);
      window.removeEventListener("cut", handleClipboard);
      window.removeEventListener("paste", handleClipboard);
      window.removeEventListener("contextmenu", handleContextMenu);

      if (requireFullscreen) {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      }
    };
  }, [enabled, isStudent, syllabusItemId, requireFullscreen, sendIntegrityEvent, showToast]);

  return {
    toast,
    dismissToast,
    isMonitoringActive: enabled && isStudent,
    loggedEventsCount,
    isFullscreen,
    hasEnteredFullscreenOnce,
    hasExitedFullscreen,
    enterFullscreen,
    dismissExitWarning,
  };
}
