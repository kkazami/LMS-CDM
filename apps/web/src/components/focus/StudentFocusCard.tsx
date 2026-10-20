/**
 * apps/web/src/components/focus/StudentFocusCard.tsx
 *
 * "My Focus" card on the ITE student dashboard.
 * Displays weekly focused minutes, comparison against last week,
 * completed sessions, average tab switches, and a 7-day bar chart.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  EyeOff,
  Clock,
  Loader2,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { FocusSummaryResponse } from "@/lib/ite/focus/types";
import { useFocusMode } from "./FocusModeContext";

interface StudentFocusCardProps {
  theme: InstituteTheme;
  instituteCode: string;
}

export default function StudentFocusCard({ theme, instituteCode }: StudentFocusCardProps) {
  const focus = useFocusMode();
  const [summary, setSummary] = useState<FocusSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadSummary() {
      try {
        const res = await fetch("/api/ite/focus/summary");
        if (!res.ok) return;
        const data = (await res.json()) as FocusSummaryResponse;
        if (!isCancelled) {
          setSummary(data);
        }
      } catch (err) {
        console.warn("Failed to load focus summary", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadSummary();
    return () => {
      isCancelled = true;
    };
  }, [focus?.isActive]);

  const primaryColor = theme.colors.primary || "#3B82F6";

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white dark:bg-[#141721] p-6 border border-slate-200/80 dark:border-white/5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 bg-slate-100 dark:bg-white/5 rounded-md animate-pulse" />
            <div className="h-3 w-40 bg-slate-100 dark:bg-white/5 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="h-28 rounded-2xl bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Calculate difference vs last week
  const diffMinutes = summary
    ? summary.focusedMinutesThisWeek - summary.focusedMinutesLastWeek
    : 0;

  const hasAnyActivity =
    summary &&
    (summary.focusedMinutesThisWeek > 0 ||
      summary.completedSessionsThisWeek > 0 ||
      summary.sevenDaySeries.some((d) => d.focusedMinutes > 0));

  // Max for bar chart scaling
  const maxDailyMinutes = summary
    ? Math.max(15, ...summary.sevenDaySeries.map((d) => d.focusedMinutes))
    : 60;

  return (
    <div className="rounded-3xl bg-white dark:bg-[#141721] p-6 border border-slate-200/80 dark:border-white/5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl"
            style={{
              backgroundColor: `${primaryColor}1A`,
              color: primaryColor,
            }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F1F5F9]">
              My Focus
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Distraction-free learning progress
            </p>
          </div>
        </div>

        {focus && !focus.isActive && (
          <button
            type="button"
            onClick={() => focus.openStartDialog({ contextType: "STUDY" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            style={{
              backgroundColor: `${primaryColor}1A`,
              color: primaryColor,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Session</span>
          </button>
        )}
      </div>

      {!hasAnyActivity ? (
        // Empty state
        <div className="rounded-2xl p-6 text-center bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10">
          <Clock className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 max-w-xs mx-auto mb-3">
            Start a focus session from any lesson to see your progress here.
          </p>
          {focus && !focus.isActive && (
            <button
              type="button"
              onClick={() => focus.openStartDialog({ contextType: "STUDY" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Begin First Session</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Main Metric */}
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {summary?.focusedMinutesThisWeek ?? 0}
              </span>
              <span className="ml-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                mins this week
              </span>
            </div>

            {/* Difference vs last week */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              {diffMinutes > 0 ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{diffMinutes}m vs last week
                </span>
              ) : diffMinutes < 0 ? (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {diffMinutes}m vs last week
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Minus className="h-3.5 w-3.5" />
                  Same as last week
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Completed Sessions
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                {summary?.completedSessionsThisWeek ?? 0}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <EyeOff className="h-3 w-3 text-slate-400" />
                Avg Tab Switches
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                {summary?.averageTabSwitchesThisWeek ?? 0}
              </span>
            </div>
          </div>

          {/* 7-Day Bar Chart */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              7-Day Activity (Minutes)
            </span>
            <div className="grid grid-cols-7 gap-2 items-end h-20 pt-2">
              {summary?.sevenDaySeries.map((day) => {
                const heightPercent = Math.max(
                  6,
                  Math.round((day.focusedMinutes / maxDailyMinutes) * 100)
                );
                const hasTime = day.focusedMinutes > 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.focusedMinutes}m
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t-lg h-14 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          hasTime ? "bg-blue-500 dark:bg-blue-400" : "bg-transparent"
                        }`}
                        style={{ height: hasTime ? `${heightPercent}%` : "0%" }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
