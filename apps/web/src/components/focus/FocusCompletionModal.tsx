/**
 * apps/web/src/components/focus/FocusCompletionModal.tsx
 *
 * Completion screen presented when the planned focus timer finishes.
 * Displays completed focused time, detected tab switches, and options
 * to take a break (end session) or keep going.
 */

"use client";

import { useRef } from "react";
import { Trophy, CheckCircle, Coffee, ArrowRight, EyeOff } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface FocusCompletionModalProps {
  isOpen: boolean;
  plannedMinutes: number;
  elapsedSeconds: number;
  tabSwitchCount: number;
  onTakeBreak: () => void;
  onKeepGoing: () => void;
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min${mins === 1 ? "" : "s"}`;
}

export default function FocusCompletionModal({
  isOpen,
  plannedMinutes,
  elapsedSeconds,
  tabSwitchCount,
  onTakeBreak,
  onKeepGoing,
}: FocusCompletionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isOpen, onTakeBreak, panelRef);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal Dialog */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-complete-title"
        aria-describedby="focus-complete-desc"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-[#141721] p-6 text-center shadow-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9] outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Celebration Badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Trophy className="h-7 w-7" />
        </div>

        <h2 id="focus-complete-title" className="text-xl font-bold mb-1">
          Goal Reached!
        </h2>
        <p id="focus-complete-desc" className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          You completed your {plannedMinutes}-minute focus session.
        </p>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
              Focused Time
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {formatMinutes(elapsedSeconds)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">
              Tab Switches
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
              <EyeOff className="h-3.5 w-3.5 text-slate-400" />
              {tabSwitchCount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onTakeBreak}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Coffee className="h-4 w-4" />
            <span>Take a Break (Complete)</span>
          </button>

          <button
            type="button"
            onClick={onKeepGoing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Keep Going (+15 mins)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
