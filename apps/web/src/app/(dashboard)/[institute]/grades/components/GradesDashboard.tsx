"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, BookOpenCheck } from "lucide-react";
import type { GradeRow } from "../types";
import type { EnrolledCourse } from "../data/grade-filter";
import type { InstituteTheme } from "@/lib/theme";

interface GradesDashboardProps {
  allRows: GradeRow[]; // Filtered rows for the selected subject (or all if "all")
  enrolledCourses: EnrolledCourse[];
  theme: InstituteTheme;
  selectedCourseId: string;
  onCourseChange: (id: string) => void;
}

type SortKey = "itemTitle" | "itemType" | "courseCode" | "grade" | "maxPoints" | "percent" | "gradedAt";
type SortDir = "asc" | "desc";

function getPercent(row: GradeRow): number {
  return Math.round((row.grade / row.maxPoints) * 100 * 10) / 10;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  activeColor: string;
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, sortKey, currentKey, currentDir, activeColor, onSort }: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group text-slate-500 dark:text-[#8B92A5]"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        <span style={isActive ? { color: activeColor } : undefined}>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" style={{ color: activeColor }} />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" style={{ color: activeColor }} />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-[#555C72] group-hover:text-slate-600 dark:group-hover:text-[#8B92A5] transition-colors" />
        )}
      </div>
    </th>
  );
}

export default function GradesDashboard({
  allRows,
  theme,
}: GradesDashboardProps) {
  const isIte = (theme?.code || "").toLowerCase() === "ite";
  const [sortKey, setSortKey] = useState<SortKey>("gradedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    return [...allRows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortKey) {
        case "itemTitle":
          aVal = a.itemTitle.toLowerCase();
          bVal = b.itemTitle.toLowerCase();
          break;
        case "itemType":
          aVal = a.itemType;
          bVal = b.itemType;
          break;
        case "courseCode":
          aVal = a.courseCode.toLowerCase();
          bVal = b.courseCode.toLowerCase();
          break;
        case "grade":
          aVal = a.grade;
          bVal = b.grade;
          break;
        case "maxPoints":
          aVal = a.maxPoints;
          bVal = b.maxPoints;
          break;
        case "percent":
          aVal = getPercent(a);
          bVal = getPercent(b);
          break;
        default:
          aVal = a.gradedAt;
          bVal = b.gradedAt;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [allRows, sortKey, sortDir]);

  // Summary stats for the currently filtered rows
  const avgPercent =
    allRows.length === 0
      ? 0
      : allRows.reduce((s, r) => s + getPercent(r), 0) / allRows.length;

  return (
    <div className="space-y-6">
      {/* Summary stats badge */}
      {allRows.length > 0 && (
        <div className="flex items-center justify-end">
          <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 rounded-2xl px-5 py-2.5 flex items-center gap-6 shadow-xs transition-colors">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                Graded Items
              </p>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-[#F0F2F8]">
                {allRows.length}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                Average Score
              </p>
              <p
                className="text-lg font-black font-mono"
                style={{ color: theme.colors.primary }}
              >
                {avgPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table as the Hero Element */}
      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 rounded-2xl p-8 shadow-xs transition-colors">
          <div className={`p-4 rounded-2xl mb-3 ${
            isIte ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-orange-500/10 text-[#F97316]"
          }`}>
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">No graded items found</p>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1 max-w-sm">
            Grades will appear here once your instructor has evaluated and recorded your classwork submissions.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs transition-colors">
          {/* Mobile Responsive Card List View (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
            {sortedRows.map((row) => {
              const pct = getPercent(row);
              const Icon = row.itemType === "ASSIGNMENT" ? ClipboardList : BookOpenCheck;
              return (
                <div key={row.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex items-center justify-center h-9 w-9 rounded-xl shrink-0"
                        style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate">
                          {row.itemTitle}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#8B92A5] font-mono truncate">
                          {row.courseCode} · {row.itemType.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono tabular-nums shrink-0"
                      style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                    <span className="text-slate-500 dark:text-[#8B92A5]">Score</span>
                    <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-[#F0F2F8]">
                      {row.grade} / {row.maxPoints} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-[#8B92A5]">
                    <span>Graded on</span>
                    <span className="font-mono">{formatDate(row.gradedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-[#1A1D27] border-b border-slate-200/80 dark:border-white/5">
                <tr>
                  <SortHeader
                    label="Assignment / Quiz"
                    sortKey="itemTitle"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Type"
                    sortKey="itemType"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Course"
                    sortKey="courseCode"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Score"
                    sortKey="grade"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Max"
                    sortKey="maxPoints"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="%"
                    sortKey="percent"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    activeColor={theme.colors.primary}
                    onSort={handleSort}
                  />
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                    Graded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {sortedRows.map((row) => {
                  const pct = getPercent(row);
                  const Icon = row.itemType === "ASSIGNMENT" ? ClipboardList : BookOpenCheck;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center h-8 w-8 rounded-xl shrink-0"
                            style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate max-w-[240px]">
                            {row.itemTitle}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#8B92A5]">
                          {row.itemType.replaceAll("_", " ")}
                        </span>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-[#F0F2F8] font-mono">
                          {row.courseCode}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#8B92A5] truncate max-w-[160px]">
                          {row.courseTitle}
                        </p>
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-[#F0F2F8]">
                        {row.grade}
                      </td>

                      {/* Max Points */}
                      <td className="px-5 py-4 text-sm font-mono tabular-nums text-slate-500 dark:text-[#8B92A5]">
                        {row.maxPoints}
                      </td>

                      {/* Percentage */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono tabular-nums"
                          style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
                        >
                          {pct}%
                        </span>
                      </td>

                      {/* Graded Date */}
                      <td className="px-5 py-4 text-xs text-slate-400 dark:text-[#8B92A5] whitespace-nowrap text-right font-medium font-mono">
                        {formatDate(row.gradedAt)}
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
