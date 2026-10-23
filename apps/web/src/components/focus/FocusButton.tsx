/**
 * apps/web/src/components/focus/FocusButton.tsx
 *
 * Dedicated Focus Mode trigger button for ITE students.
 * Silently renders null for non-ITE users or non-student roles.
 */

"use client";

import { Sparkles } from "lucide-react";
import { useFocusMode } from "./FocusModeContext";
import type { FocusContextType } from "@/lib/ite/focus/types";

interface FocusButtonProps {
  contextType: FocusContextType;
  courseId?: string | null;
  refId?: string | null;
  title?: string;
  variant?: "primary" | "secondary" | "pill";
  className?: string;
}

export default function FocusButton({
  contextType,
  courseId,
  refId,
  title,
  variant = "secondary",
  className = "",
}: FocusButtonProps) {
  const focus = useFocusMode();

  // If user is not an ITE student (or if Focus Mode already active), do not show start button
  if (!focus) return null;

  const handleClick = () => {
    if (focus.isActive) {
      focus.endSession(true);
    } else {
      focus.openStartDialog({
        contextType,
        courseId,
        refId,
        title,
      });
    }
  };

  if (focus.isActive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all shadow-xs cursor-pointer ${className}`}
        aria-label="Focus mode active. Click to view options or exit."
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Focus Active</span>
      </button>
    );
  }

  if (variant === "primary") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 ${className}`}
        aria-label="Start distraction-free focus mode"
      >
        <Sparkles className="h-4 w-4" />
        <span>Focus</span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer ${className}`}
        aria-label="Start distraction-free focus mode"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Focus</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${className}`}
      aria-label="Start distraction-free focus mode"
    >
      <Sparkles className="h-4 w-4 text-blue-500" />
      <span>Focus</span>
    </button>
  );
}
