/**
 * apps/web/src/components/focus/FocusModeContext.tsx
 *
 * React context and hook for ITE Focus Mode.
 */

"use client";

import { createContext, useContext } from "react";
import type { FocusContextType } from "@/lib/ite/focus/types";

export interface StartFocusOptions {
  contextType: FocusContextType;
  courseId?: string | null;
  refId?: string | null;
  plannedMinutes?: number | null;
  requestFullscreen?: boolean;
}

export interface FocusModeContextValue {
  /** True when a focus session is active */
  isActive: boolean;
  sessionId: string | null;
  contextType: FocusContextType | null;
  courseId: string | null;
  refId: string | null;
  elapsedFocusedSeconds: number;
  plannedMinutes: number | null;
  tabSwitchCount: number;
  isPaused: boolean;
  isFullscreen: boolean;
  awayNotice: string | null;
  isStartDialogOpen: boolean;
  dialogContext: {
    contextType: FocusContextType;
    courseId?: string | null;
    refId?: string | null;
    title?: string;
  } | null;
  openStartDialog: (options?: {
    contextType?: FocusContextType;
    courseId?: string | null;
    refId?: string | null;
    title?: string;
  }) => void;
  closeStartDialog: () => void;
  startSession: (options: StartFocusOptions) => Promise<void>;
  endSession: (confirmIfEarly?: boolean) => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

export const FocusModeContext = createContext<FocusModeContextValue | null>(null);

/**
 * Hook to access Focus Mode state and controls.
 * Returns null if not within a FocusModeProvider (e.g. non-ITE or non-student layouts).
 */
export function useFocusMode(): FocusModeContextValue | null {
  return useContext(FocusModeContext);
}
