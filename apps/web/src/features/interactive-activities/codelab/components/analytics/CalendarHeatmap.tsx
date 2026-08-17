"use client";

import { useMemo } from "react";
import type { InstructorSubmissionRecord } from "../CodeLabInstructorClient";

interface CalendarHeatmapProps {
  submissions: InstructorSubmissionRecord[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarHeatmap({ submissions }: CalendarHeatmapProps) {
  // Grid: 7 days (rows) x 24 hours (columns)
  const { grid, maxCount, totalCount } = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    let total = 0;

    submissions.forEach((s) => {
      const d = new Date(s.submittedAt);
      if (isNaN(d.getTime())) return;
      const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
      const hour = d.getHours();
      matrix[dayOfWeek][hour] += 1;
      total += 1;
      if (matrix[dayOfWeek][hour] > max) {
        max = matrix[dayOfWeek][hour];
      }
    });

    return { grid: matrix, maxCount: max, totalCount: total };
  }, [submissions]);

  return (
    <div className="p-6 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
            📅 Learning Cadence Heatmap
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
            Submission density across days of the week &amp; time of day ({totalCount} total events)
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#8B92A5] font-semibold">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 dark:bg-white/[0.04]" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-900/50" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 dark:bg-emerald-700/70" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px] space-y-1">
          {/* Hour labels */}
          <div className="flex items-center text-[10px] font-mono text-slate-400 dark:text-[#555C72]">
            <div className="w-10 shrink-0" />
            <div className="grid grid-cols-24 flex-1 gap-1">
              {HOURS.map((h) => (
                <div key={h} className="text-center">
                  {h % 3 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Days rows */}
          {DAYS.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="flex items-center gap-2">
              <span className="w-10 text-xs font-bold text-slate-600 dark:text-[#8B92A5] shrink-0">
                {dayLabel}
              </span>
              <div className="grid grid-cols-24 flex-1 gap-1">
                {HOURS.map((hour) => {
                  const count = grid[dayIdx][hour];
                  let bgClass = "bg-slate-100 dark:bg-white/[0.04] border-transparent";
                  if (count > 0) {
                    if (count <= 2) bgClass = "bg-emerald-200 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800/40";
                    else if (count <= 5) bgClass = "bg-emerald-400 dark:bg-emerald-700/70 border-emerald-500 dark:border-emerald-600/50";
                    else bgClass = "bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400 text-white";
                  }

                  const hourLabel =
                    hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;

                  return (
                    <div
                      key={hour}
                      title={`${dayLabel} at ${hourLabel}: ${count} submissions`}
                      className={`h-5 rounded-xs border transition-all duration-150 hover:scale-125 hover:z-10 cursor-pointer ${bgClass}`}
                      style={{
                        animation: `calendarFadeIn 400ms ease-out forwards`,
                        animationDelay: `${Math.min((dayIdx * 24 + hour) * 3, 400)}ms`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
