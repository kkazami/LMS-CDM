/**
 * apps/web/src/components/focus/TopbarFocusButton.tsx
 *
 * Focus Mode trigger button rendered in Topbar for ITE students.
 * Silently renders null for non-ITE users, non-students, or while Focus Mode is active.
 */

"use client";

import { Sparkles } from "lucide-react";
import { useFocusMode } from "./FocusModeContext";
import { resolveFocusContextFromPath } from "@/lib/ite/focus/route-context";

interface TopbarFocusButtonProps {
  pathname?: string | null;
  className?: string;
}

export default function TopbarFocusButton({ pathname, className = "" }: TopbarFocusButtonProps) {
  const focus = useFocusMode();

  // If user is not an ITE student, or if Focus Mode is already active, render nothing
  if (!focus || focus.isActive) return null;

  const handleClick = () => {
    const routeContext = resolveFocusContextFromPath(pathname);
    focus.openStartDialog(routeContext);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Start Focus Mode"
      title="Start Focus Mode (Alt+Shift+F)"
      className={`relative inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] px-2 sm:px-3 py-1 sm:py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 h-8 w-8 sm:h-10 sm:w-auto items-center justify-center shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
      <span className="hidden sm:inline text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-[#F0F2F8]">
        Focus
      </span>
    </button>
  );
}
