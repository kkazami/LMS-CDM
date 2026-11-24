"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  ChevronRight,
  Filter,
  GraduationCap,
  Medal,
  Trophy,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type {
  IbeInstructorTopGradesData,
  TopGradeStudentEntry,
} from "@/lib/ibe-leaderboard/top-grades";

interface IbeTopGradesWidgetProps {
  data: IbeInstructorTopGradesData;
  instituteCode: string;
  theme: InstituteTheme;
}

type PeriodView = "MIDTERM" | "FINALS" | "BOTH";

function getRankBadgeStyle(rank: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (rank === 1) {
    return {
      bg: "bg-amber-500/15 dark:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-400/50 dark:border-amber-400/30",
    };
  }
  if (rank === 2) {
    return {
      bg: "bg-slate-300/40 dark:bg-slate-400/15",
      text: "text-slate-700 dark:text-slate-200",
      border: "border-slate-300 dark:border-slate-400/30",
    };
  }
  if (rank === 3) {
    return {
      bg: "bg-orange-500/15 dark:bg-orange-500/20",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-400/40 dark:border-orange-400/30",
    };
  }
  return {
    bg: "bg-slate-100 dark:bg-white/5",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200/80 dark:border-white/10",
  };
}

function TopGradeList({
  entries,
  periodLabel,
  periodCode,
  instituteCode,
  firstCourseId,
}: {
  entries: TopGradeStudentEntry[];
  periodLabel: string;
  periodCode: "MIDTERM" | "FINALS";
  instituteCode: string;
  firstCourseId?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2">
        <GraduationCap className="mx-auto h-9 w-9 text-slate-400 dark:text-slate-500 mb-2" />
        <p className="text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
          No {periodLabel} grades recorded yet
        </p>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-xs mx-auto">
          Once you assign classwork to {periodLabel} and record student scores in
          the Gradebook, the Top 10 highest-scoring students will appear here.
        </p>
        {firstCourseId && (
          <Link
            href={`/${instituteCode}/courses/${firstCourseId}/gradebook?period=${periodCode}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>Open Gradebook ({periodLabel})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const badge = getRankBadgeStyle(entry.rank);
        return (
          <div
            key={`${entry.period}-${entry.courseId}-${entry.studentId}`}
            className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/3 hover:bg-slate-100/80 dark:hover:bg-white/6 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 text-xs font-black font-mono tabular-nums ${badge.bg} ${badge.text} ${badge.border}`}
                title={`Rank #${entry.rank}`}
              >
                {entry.rank <= 3 ? (
                  <Medal className="h-3.5 w-3.5" />
                ) : (
                  `#${entry.rank}`
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500">
                    #{entry.rank}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F1F5F9] truncate">
                    {entry.studentName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {entry.courseCode}
                  </span>
                  {entry.section && <span>• Sec {entry.section}</span>}
                  {entry.studentNumber && <span>• {entry.studentNumber}</span>}
                  <span>
                    • {entry.gradedCount}/{entry.totalCount} graded
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
                      entry.isPassingGrade
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {entry.percentage.toFixed(2)}%
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                      entry.isPassingGrade
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    }`}
                    title="Philippine Collegiate Grade Point Equivalent"
                  >
                    {entry.gradePoint}
                  </span>
                </div>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                  {entry.isComplete ? `${periodLabel} Final` : `${periodLabel} Standing`}
                </span>
              </div>

              <Link
                href={`/${instituteCode}/courses/${entry.courseId}/gradebook?period=${entry.period}`}
                className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                title={`View ${entry.courseCode} ${periodLabel} Gradebook`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IbeTopGradesWidget({
  data,
  instituteCode,
  theme,
}: IbeTopGradesWidgetProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [periodView, setPeriodView] = useState<PeriodView>("MIDTERM");

  const activeGroup = useMemo(() => {
    if (selectedCourseId === "ALL") {
      return {
        midtermTop10: data.overallMidtermTop10,
        finalsTop10: data.overallFinalsTop10,
      };
    }
    const found = data.byCourse.find((c) => c.courseId === selectedCourseId);
    return {
      midtermTop10: found?.midtermTop10 ?? [],
      finalsTop10: found?.finalsTop10 ?? [],
    };
  }, [data, selectedCourseId]);

  const firstCourseId =
    selectedCourseId !== "ALL"
      ? selectedCourseId
      : data.byCourse[0]?.courseId;

  return (
    <div className="space-y-4" id="ibe-top-grades">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9]">
              Top 10 Highest Grades
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Highest Midterm &amp; Finals academic performers
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Award className="h-3.5 w-3.5" />
          <span>Top 10 Leaderboard</span>
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3.5">
        {/* Controls: Period Tabs & Course Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div
            className="inline-flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200/70 dark:border-white/10"
            role="tablist"
            aria-label="Grading period leaderboard"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodView === "MIDTERM"}
              onClick={() => setPeriodView("MIDTERM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodView === "MIDTERM"
                  ? "bg-white dark:bg-[#1E2330] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Midterm ({activeGroup.midtermTop10.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodView === "FINALS"}
              onClick={() => setPeriodView("FINALS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodView === "FINALS"
                  ? "bg-white dark:bg-[#1E2330] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Finals ({activeGroup.finalsTop10.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodView === "BOTH"}
              onClick={() => setPeriodView("BOTH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodView === "BOTH"
                  ? "bg-white dark:bg-[#1E2330] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Both
            </button>
          </div>

          {data.byCourse.length > 1 && (
            <div className="relative flex items-center">
              <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Filter Top 10 grades by class"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full sm:w-auto pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="ALL">All Classes ({data.byCourse.length})</option>
                {data.byCourse.map((course) => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.courseCode}
                    {course.section ? ` • Sec ${course.section}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Leaderboard Content */}
        {periodView === "MIDTERM" && (
          <TopGradeList
            entries={activeGroup.midtermTop10}
            periodLabel="Midterm"
            periodCode="MIDTERM"
            instituteCode={instituteCode}
            firstCourseId={firstCourseId}
          />
        )}

        {periodView === "FINALS" && (
          <TopGradeList
            entries={activeGroup.finalsTop10}
            periodLabel="Finals"
            periodCode="FINALS"
            instituteCode={instituteCode}
            firstCourseId={firstCourseId}
          />
        )}

        {periodView === "BOTH" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Midterm Top 10 ({activeGroup.midtermTop10.length})
                </h3>
              </div>
              <TopGradeList
                entries={activeGroup.midtermTop10}
                periodLabel="Midterm"
                periodCode="MIDTERM"
                instituteCode={instituteCode}
                firstCourseId={firstCourseId}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Finals Top 10 ({activeGroup.finalsTop10.length})
                </h3>
              </div>
              <TopGradeList
                entries={activeGroup.finalsTop10}
                periodLabel="Finals"
                periodCode="FINALS"
                instituteCode={instituteCode}
                firstCourseId={firstCourseId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

