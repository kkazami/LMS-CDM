"use client";

import { useState, useMemo } from "react";
import { Flame } from "lucide-react";
import CountUpNumber from "./CountUpNumber";
import type { CodeLabProblemSummary } from "../../problems/types";
import type { InstructorSubmissionRecord } from "../CodeLabInstructorClient";

const LANGUAGES = [
  { key: "python", label: "Python", emoji: "🐍" },
  { key: "cpp", label: "C++", emoji: "⚙️" },
  { key: "csharp", label: "C#", emoji: "🔷" },
  { key: "java", label: "Java", emoji: "☕" },
  { key: "javascript", label: "JS", emoji: "🟡" },
  { key: "sql", label: "SQL", emoji: "🗄️" },
  { key: "html", label: "HTML", emoji: "🌐" },
  { key: "css", label: "CSS", emoji: "🎨" },
] as const;

interface MasteryHeatmapProps {
  problems: CodeLabProblemSummary[];
  submissions: InstructorSubmissionRecord[];
}

export default function MasteryHeatmap({ problems, submissions }: MasteryHeatmapProps) {
  const [activeLang, setActiveLang] = useState<string>("python");

  // Filter problems to the selected language track (levels 1–30 for that language)
  const trackProblems = useMemo(
    () => problems.filter((p) => p.language === activeLang).sort((a, b) => a.level - b.level),
    [problems, activeLang]
  );

  // Build per-problem metrics map for the selected language
  const problemMetrics = useMemo(() => {
    const map = new Map<string, { totalScore: number; count: number }>();
    submissions
      .filter((s) => s.language === activeLang)
      .forEach((s) => {
        const cur = map.get(s.templateId) ?? { totalScore: 0, count: 0 };
        cur.totalScore += s.score;
        cur.count += 1;
        map.set(s.templateId, cur);
      });
    return map;
  }, [submissions, activeLang]);

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
              Class Mastery Heatmap
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              30 levels per language — select a track to inspect
            </p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-[#8B92A5] font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" /> ≥80%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" /> 50–79%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40" /> &lt;50%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" /> Untested
          </span>
        </div>
      </div>

      {/* Language Tab Row */}
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.key}
            type="button"
            onClick={() => setActiveLang(lang.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer border ${
              activeLang === lang.key
                ? "bg-[#F97316] text-white border-[#F97316] shadow-sm"
                : "bg-white dark:bg-[#1E2132] text-slate-600 dark:text-[#8B92A5] border-[#E4E6EF] dark:border-white/10 hover:border-[#F97316]/50 hover:text-[#F97316]"
            }`}
          >
            {lang.emoji} {lang.label}
          </button>
        ))}
      </div>

      {/* Heatmap Grid — 30 cells for the selected language */}
      {trackProblems.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-[#555C72] text-sm">
          No problems found for this language track yet.
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5 pt-1">
          {trackProblems.map((p) => {
            const m = problemMetrics.get(p.id);
            const count = m?.count ?? 0;
            const avg = count > 0 ? Math.round(m!.totalScore / count) : null;

            let cellClass =
              "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-400 dark:text-[#555C72]";
            if (avg !== null) {
              if (avg >= 80)
                cellClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold";
              else if (avg >= 50)
                cellClass = "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold";
              else
                cellClass = "bg-rose-500/10 border-rose-500/30 text-rose-500 font-bold";
            }

            return (
              <div
                key={p.id}
                title={`${p.title} (Level ${p.level}): ${count} attempts, ${
                  avg !== null ? `${avg}% class average` : "No attempts yet"
                }`}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-150 hover:scale-105 cursor-pointer shadow-xs ${cellClass}`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75">L{p.level}</span>
                {avg !== null ? (
                  <CountUpNumber value={avg} suffix="%" className="text-sm font-black mt-0.5 block" />
                ) : (
                  <span className="text-sm font-black mt-0.5">—</span>
                )}
                <span className="text-[10px] opacity-60 font-mono mt-0.5">{count} att</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
