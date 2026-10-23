/**
 * apps/web/src/components/focus/FocusStartDialog.tsx
 *
 * Modal dialog for launching Focus Mode with duration presets,
 * optional fullscreen mode, and honest disclosure of browser limits.
 */

"use client";

import { useState, useRef } from "react";
import { Sparkles, Clock, Maximize2, Shield, X, AlertCircle } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { useFocusMode } from "./FocusModeContext";
import type { FocusContextType } from "@/lib/ite/focus/types";

const DURATION_PRESETS: Array<{ minutes: number | null; label: string; sub: string }> = [
  { minutes: 15, label: "15 min", sub: "Quick Sprint" },
  { minutes: 25, label: "25 min", sub: "Pomodoro" },
  { minutes: 45, label: "45 min", sub: "Deep Work" },
  { minutes: null, label: "Open", sub: "No Timer" },
];

export default function FocusStartDialog() {
  const focus = useFocusMode();
  const panelRef = useRef<HTMLDivElement>(null);

  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(25);
  const [requestFullscreen, setRequestFullscreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = Boolean(focus?.isStartDialogOpen);

  useDialogA11y(isOpen, () => focus?.closeStartDialog(), panelRef);

  if (!focus || !isOpen) return null;

  const contextType: FocusContextType = focus.dialogContext?.contextType || "STUDY";
  const courseId = focus.dialogContext?.courseId || null;
  const refId = focus.dialogContext?.refId || null;
  const title = focus.dialogContext?.title;

  const handleStart = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await focus.startSession({
        contextType,
        courseId,
        refId,
        plannedMinutes: selectedMinutes,
        requestFullscreen,
      });
      focus.closeStartDialog();
    } catch (err) {
      console.error("Failed to start focus session:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={focus.closeStartDialog}
        aria-hidden="true"
      />

      {/* Modal Dialog Shell */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-start-title"
        aria-describedby="focus-start-desc"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-[#141721] p-6 shadow-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9] outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="focus-start-title" className="text-lg font-bold leading-tight">
                Start Focus Mode
              </h2>
              <p id="focus-start-desc" className="text-xs text-slate-500 dark:text-slate-400">
                {title ? `Focusing on: ${title}` : "Distraction-free learning environment"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={focus.closeStartDialog}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Duration Selection */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Select Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedMinutes(preset.minutes)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 font-medium"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="text-sm font-bold">{preset.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{preset.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fullscreen Option */}
        <div className="mb-5">
          <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
            <input
              type="checkbox"
              checked={requestFullscreen}
              onChange={(e) => setRequestFullscreen(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
                Distraction-free fullscreen
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fills your entire monitor for maximum concentration.
              </p>
            </div>
          </label>
        </div>

        {/* Honest Disclosure / Technical Limit Banner */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
          <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">Honesty about limits</strong>
            Focus Mode hides in-app sidebars, chats, and notification alerts, and detects when you leave the page. It cannot block other browser tabs or external applications.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={focus.closeStartDialog}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isSubmitting ? "Starting..." : "Begin Focus Session"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
