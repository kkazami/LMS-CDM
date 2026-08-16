"use client";

import { useMemo, useState } from "react";
import AnimatedBar from "./AnimatedBar";
import type { InstructorSubmissionRecord } from "../CodeLabInstructorClient";

const LANGUAGES = [
  "python",
  "cpp",
  "csharp",
  "java",
  "javascript",
  "sql",
  "html",
  "css",
] as const;

interface FunnelChartProps {
  submissions: InstructorSubmissionRecord[];
}

export default function FunnelChart({ submissions }: FunnelChartProps) {
  const [activeLang, setActiveLang] = useState<string>("python");

  // Count unique students who have reached each level (at least 1 submission)
  const funnelData = useMemo(() => {
    const langSubs = submissions.filter((s) => s.language === activeLang);

    // For each level 1–30, count unique students with a submission at that level
    const levels: Array<{
      level: number;
      uniqueStudents: number;
      avgScore: number;
      isChokepoint: boolean;
    }> = [];

    for (let level = 1; level <= 30; level++) {
      const levelSubs = langSubs.filter((s) => {
        if (s.level === level) return true;
        return s.templateId === `${activeLang}-level-${level}` || s.templateId === `${activeLang}-${level}`;
      });

      const uniqueStudents = new Set(levelSubs.map((s) => s.studentId)).size;
      const avgScore =
        levelSubs.length > 0
          ? Math.round(levelSubs.reduce((sum, s) => sum + s.score, 0) / levelSubs.length)
          : 0;

      levels.push({ level, uniqueStudents, avgScore, isChokepoint: false });
    }

    // Mark chokepoints: levels where unique students drops >30% vs previous level
    const maxStudents = Math.max(...levels.map((l) => l.uniqueStudents), 1);
    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1].uniqueStudents;
      const cur = levels[i].uniqueStudents;
      if (prev > 0 && (prev - cur) / prev > 0.3) {
        levels[i].isChokepoint = true;
      }
    }

    return { levels, maxStudents };
  }, [submissions, activeLang]);

  return (
    <div className="p-6 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
            📉 Level Progression Funnel
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
            Unique students reaching each level. ⚠️ = chokepoint (&gt;30% drop-off).
          </p>
        </div>
        <select
          value={activeLang}
          onChange={(e) => setActiveLang(e.target.value)}
          className="bg-white dark:bg-[#1E2132] border border-[#E4E6EF] dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] cursor-pointer focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
        {funnelData.levels.map(({ level, uniqueStudents, avgScore, isChokepoint }) => {
          const pct =
            funnelData.maxStudents > 0
              ? Math.round((uniqueStudents / funnelData.maxStudents) * 100)
              : 0;

          return (
            <div key={level} className="flex items-center gap-3 text-xs">
              <span
                className={`w-8 text-right font-bold shrink-0 ${
                  isChokepoint ? "text-rose-500 font-black" : "text-slate-500 dark:text-[#8B92A5]"
                }`}
              >
                L{level}
              </span>
              <div className="flex-1">
                <AnimatedBar
                  percent={pct}
                  colorClass={
                    isChokepoint
                      ? "bg-rose-500"
                      : avgScore >= 80
                      ? "bg-emerald-500"
                      : avgScore >= 50
                      ? "bg-amber-500"
                      : "bg-rose-400"
                  }
                  heightClass="h-4"
                />
              </div>
              <span className="w-10 text-right font-mono text-slate-600 dark:text-[#8B92A5] shrink-0">
                {uniqueStudents}
              </span>
              {isChokepoint && (
                <span className="text-rose-500 font-bold shrink-0" title="Chokepoint: >30% drop-off">
                  ⚠️
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
