"use client";

import type { PerCourseStats } from "../data/grade-filter";
import type { GradeRow } from "../types";
import type { InstituteTheme } from "@/lib/theme";
import {
  formatGradePoint,
  isPassing,
  HIGHEST_GRADE_POINT,
  LOWEST_PASSING_GRADE_POINT,
  PASSING_MIN_PERCENT,
} from "@/lib/grading/ph-scale";

interface GradesProgressProps {
  gwa: number | null;
  gwaRemark: "Passed" | "Failed" | "";
  isGwaPassing: boolean;
  overallPercent: number;
  perCourseStats: PerCourseStats[];
  allRows: GradeRow[]; // Filtered rows according to active Subject filter
  theme: InstituteTheme;
  isAllSubjects?: boolean;
  onSelectCourse?: (courseId: string) => void;
}

// ── SVG Radial GWA Progress Arc (Fill represents percentage score) ──
interface RadialProgressProps {
  percent: number; // 0–100
  isPassingGrade: boolean;
  color: string;
}

function RadialProgress({ percent, isPassingGrade, color }: RadialProgressProps) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, percent)) / 100; // 0–1 fill based on percentage
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;
  const arcColor = isPassingGrade ? color : "#EF4444";

  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        className="stroke-slate-100 dark:stroke-white/10"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc (percentage driven) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={arcColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

function getProgressBarColor(gp: number | null, pct: number): string {
  if (gp !== null && !isPassing(gp)) return "#EF4444"; // red for failing (5.00)
  if (pct >= 90) return "#10B981"; // emerald
  if (pct >= 75) return "#F59E0B"; // amber
  return "#EF4444"; // red
}

function formatDateLabel(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GradesProgress({
  gwa,
  gwaRemark,
  isGwaPassing,
  overallPercent,
  perCourseStats,
  allRows,
  theme,
  isAllSubjects = true,
  onSelectCourse,
}: GradesProgressProps) {
  const gwaDisplay = formatGradePoint(gwa);

  // Dynamic caption derived from the grading scale constants (Task 1)
  const scaleCaption = `${HIGHEST_GRADE_POINT.toFixed(2)} is the highest · ${LOWEST_PASSING_GRADE_POINT.toFixed(2)} (${PASSING_MIN_PERCENT}%) is the lowest passing grade · below ${PASSING_MIN_PERCENT}% is failing`;

  // Recent Milestones: last 6 graded items from the active filtered rows (Task 4)
  const milestones = [...allRows]
    .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* ── Top row: GWA card + Overall avg ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Cumulative GWA Card / Subject Grade Point Card */}
        <div
          aria-label="Academic Progress Tracking - Cumulative GWA"
          className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 flex flex-col items-center text-center transition-colors"
        >
          {/* Accessible label for screen readers (Task 1) */}
          <h3 className="sr-only">Cumulative GWA (General Weighted Average)</h3>

          <div className="relative mt-2">
            <RadialProgress
              percent={overallPercent}
              isPassingGrade={gwa !== null ? isGwaPassing : true}
              color={theme.colors.primary}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
              <span
                className="text-3xl font-bold font-mono tabular-nums"
                style={{
                  color:
                    gwa !== null && !isGwaPassing
                      ? "#EF4444"
                      : theme.colors.primary,
                }}
              >
                {gwaDisplay}
              </span>
              {gwaRemark ? (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full border ${
                    isGwaPassing
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
                  }`}
                >
                  {gwaRemark}
                </span>
              ) : null}
            </div>
          </div>

          {/* Derived scale caption (Task 1) */}
          <p className="mt-4 text-xs font-medium text-slate-500 dark:text-[#8B92A5]">
            {scaleCaption}
          </p>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
            Based on {allRows.length} graded item{allRows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Overall % card */}
        <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 flex flex-col transition-colors">
          <h3 className="text-xs font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider mb-4">
            {isAllSubjects ? "Overall Average" : "Subject Average"}
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-5xl font-bold font-mono tabular-nums"
                style={{ color: theme.colors.primary }}
              >
                {overallPercent.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-400 dark:text-[#8B92A5] mt-2">
                Across {perCourseStats.length} class
                {perCourseStats.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-400 dark:text-[#8B92A5] mb-1 font-mono">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.max(0, overallPercent))}%`,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-class completion information (Restored Task 4) ── */}
      <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
            Completion by Class
          </h3>
          {isAllSubjects && perCourseStats.length > 0 && (
            <span className="text-xs text-slate-400 dark:text-[#8B92A5]">
              Click a subject to filter
            </span>
          )}
        </div>
        <div className="space-y-4">
          {perCourseStats.map((stat) => {
            const barColor = getProgressBarColor(stat.gradePoint, stat.avgPercent);
            const courseGpDisplay = formatGradePoint(stat.gradePoint);
            const isClickable = isAllSubjects && Boolean(onSelectCourse);

            return (
              <div
                key={stat.courseId}
                onClick={() => {
                  if (isClickable && onSelectCourse) {
                    onSelectCourse(stat.courseId);
                  }
                }}
                className={`p-3 rounded-xl transition-colors ${
                  isClickable
                    ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.05]"
                    : ""
                }`}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && onSelectCourse && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelectCourse(stat.courseId);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
                      {stat.courseCode}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-[#8B92A5] truncate max-w-[200px] sm:max-w-xs">
                      {stat.courseTitle}
                    </span>
                    {stat.remark ? (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                          stat.remark === "Passed"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                            : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
                        }`}
                      >
                        {stat.remark}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4 font-mono">
                    <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] tabular-nums">
                      {courseGpDisplay}
                    </span>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: barColor }}
                    >
                      ({stat.avgPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(0, stat.avgPercent))}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1.5">
                  {stat.itemCount} graded item{stat.itemCount !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Milestones (Restored Task 4, respects Subject filter) ── */}
      {milestones.length > 0 && (
        <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
              Recent Milestones
            </h3>
            <span className="text-xs text-slate-400 dark:text-[#8B92A5]">
              Latest {milestones.length} graded item{milestones.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="pb-3 text-left text-[11px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider">
                    Item
                  </th>
                  <th className="pb-3 text-left text-[11px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider">
                    Course
                  </th>
                  <th className="pb-3 text-left text-[11px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider">
                    Score
                  </th>
                  <th className="pb-3 text-right text-[11px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {milestones.map((row) => {
                  const pct = Math.round((row.grade / row.maxPoints) * 100 * 10) / 10;
                  const color = getProgressBarColor(null, pct);
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 pr-4 text-sm text-slate-900 dark:text-[#F0F2F8] font-medium max-w-44 truncate">
                        {row.itemTitle}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-slate-500 dark:text-[#8B92A5] font-mono">
                        {row.courseCode}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color }}
                        >
                          {pct}%
                        </span>
                        <span className="text-xs text-slate-400 dark:text-[#8B92A5] ml-1.5 font-mono">
                          ({row.grade}/{row.maxPoints})
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-400 dark:text-[#8B92A5] whitespace-nowrap text-right font-mono">
                        {formatDateLabel(row.gradedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
