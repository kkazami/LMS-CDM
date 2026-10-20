/**
 * apps/web/src/components/guidance/StudyHelpPanel.tsx
 *
 * "Study help" button and slide-over panel for the learning-material reader.
 * Accessible dialog with focus trap, Esc dismissal, loading skeleton, error retry,
 * practice question toggle, and daily quota indicator.
 */

"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  Compass,
  RefreshCw,
} from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { StudyHelpResponse } from "@/lib/ite/guidance/types";

interface StudyHelpPanelProps {
  materialId: string;
  materialTitle?: string;
}

export default function StudyHelpPanel({ materialId, materialTitle }: StudyHelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<StudyHelpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, () => setIsOpen(false), containerRef, { autoFocus: true });

  async function fetchStudyHelp() {
    setIsLoading(true);
    setError(null);
    setIsRateLimited(false);
    setShowAnswer(false);

    try {
      const res = await fetch("/api/ite/guidance/material-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true);
        }
        setError(body.message || "Failed to generate study help.");
        return;
      }

      setData(body as StudyHelpResponse);
    } catch {
      setError("Network connection issue. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpen() {
    setIsOpen(true);
    // If not loaded yet, fetch immediately
    if (!data && !isLoading) {
      fetchStudyHelp();
    }
  }

  return (
    <>
      {/* ── Top Bar Trigger Button ── */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer active:scale-95"
        aria-label="Open AI Study Help for this lesson"
      >
        <Sparkles className="h-4 w-4" />
        <span>Study Help</span>
      </button>

      {/* ── Slide-Over Modal / Drawer ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          aria-modal="true"
          role="dialog"
          aria-labelledby="study-help-title"
        >
          {/* Slide-over Container */}
          <div
            ref={containerRef}
            className="w-full max-w-lg h-full flex flex-col bg-white dark:bg-[#12141D] border-l border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#151824]/60">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-[#F97316] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="study-help-title"
                    className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]"
                  >
                    Study Help
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5] truncate max-w-[260px]">
                    {materialTitle || "Lesson Material"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {data && !isLoading && (
                  <button
                    type="button"
                    onClick={fetchStudyHelp}
                    title="Regenerate study help"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Regenerate"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close study help panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* 1. Loading State */}
              {isLoading && (
                <div
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4"
                  aria-live="polite"
                >
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
                      <Sparkles className="h-7 w-7 animate-pulse" />
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-[#F97316] absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-[#F0F2F8]">
                      Analyzing lesson content...
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-xs mt-1">
                      Generating key points, self-check question, and reflection prompt.
                    </p>
                  </div>

                  {/* Skeleton cards */}
                  <div className="w-full space-y-3 pt-4">
                    <div className="h-20 w-full rounded-2xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
                    <div className="h-28 w-full rounded-2xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
                    <div className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
                  </div>
                </div>
              )}

              {/* 2. Error / Rate Limited State */}
              {!isLoading && error && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                        {isRateLimited ? "Daily Request Limit" : "Notice"}
                      </h3>
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>
                  {!isRateLimited && (
                    <div className="pt-2 text-right">
                      <button
                        type="button"
                        onClick={fetchStudyHelp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Success State */}
              {!isLoading && !error && data && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Summary Card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-[#171A27] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-2.5 text-[#F97316]">
                      <BookOpen className="h-4 w-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Summary
                      </h3>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-[#E2E8F0] leading-relaxed">
                      {data.summary}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-[#171A27] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-3 text-amber-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Key Points
                      </h3>
                    </div>
                    <ul className="space-y-2.5">
                      {data.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Practice Question */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-[#171A27] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 text-indigo-500">
                        <HelpCircle className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Self-Check Question
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white mb-3 leading-relaxed">
                      {data.practiceQuestion.question}
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline cursor-pointer"
                    >
                      {showAnswer ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Hide Model Answer</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Show Model Answer</span>
                        </>
                      )}
                    </button>

                    {showAnswer && (
                      <div className="mt-3 p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-500/20 animate-in fade-in duration-150">
                        <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                          {data.practiceQuestion.answer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pedagogical Reflection */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-[#171A27] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-2 text-emerald-500">
                      <Compass className="h-4 w-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Teaching Reflection
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed italic">
                      "{data.reflection}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#151824]/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#8B92A5]">
              <span>AI-generated from this material. Check it against the lesson.</span>
              {data && (
                <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                  {data.remainingToday} request{data.remainingToday === 1 ? "" : "s"} left today
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
