"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ClipboardList, BookOpenCheck } from "lucide-react";
import type { GradeRow } from "../types";
import type { EnrolledCourse } from "../hooks/useGrades";
import type { InstituteTheme } from "@/lib/theme";

interface GradesDashboardProps {
  allRows: GradeRow[];
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
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort }: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group text-slate-500 dark:text-[#8B92A5]"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        <span className={isActive ? "text-[#F97316]" : ""}>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-[#F97316]" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-[#F97316]" />
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
  enrolledCourses,
  theme: _theme,
  selectedCourseId,
  onCourseChange,
}: GradesDashboardProps) {
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

  const filteredRows = useMemo(() => {
    return selectedCourseId === "all"
      ? allRows
      : allRows.filter((r) => r.courseId === selectedCourseId);
  }, [allRows, selectedCourseId]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, sortKey, sortDir]);

  // Summary stats
  const avgPercent =
    filteredRows.length === 0
      ? 0
      : filteredRows.reduce((s, r) => s + getPercent(r), 0) / filteredRows.length;

  return (
    <div className="space-y-6">
      {/* Filter + summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <select
          id="grades-course-filter"
          value={selectedCourseId}
          onChange={(e) => onCourseChange(e.target.value)}
          className="min-w-[220px] px-4 py-2.5 text-sm font-medium bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] text-slate-900 dark:text-[#F0F2F8] rounded-xl cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
        >
          <option value="all">All Classes</option>
          {enrolledCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.code}
            </option>
          ))}
        </select>

        {filteredRows.length > 0 && (
          <div className="bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl px-5 py-2.5 flex items-center gap-6 shadow-xs">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                Items
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
                {filteredRows.length}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                Average
              </p>
              <p className="text-lg font-black text-[#F97316]">
                {avgPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Table as the Hero Element */}
      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-8 shadow-sm">
          <div className="p-4 rounded-2xl bg-orange-500/10 text-[#F97316] mb-3">
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">No graded items found</p>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1 max-w-sm">
            Grades will appear here once your instructor has evaluated and recorded your classwork submissions.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-[#22263A] border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)]">
                <tr>
                  <SortHeader
                    label="Assignment / Quiz"
                    sortKey="itemTitle"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Type"
                    sortKey="itemType"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Course"
                    sortKey="courseCode"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Score"
                    sortKey="grade"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Max"
                    sortKey="maxPoints"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="%"
                    sortKey="percent"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                    Graded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EF]/60 dark:divide-[rgba(255,255,255,0.04)]">
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
                          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-orange-500/10 text-[#F97316] shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate max-w-[220px]">
                            {row.itemTitle}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#8B92A5]">
                          {row.itemType === "ASSIGNMENT" ? "Assignment" : "Quiz"}
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
                      <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                        {row.grade}
                      </td>

                      {/* Max Points */}
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-[#8B92A5]">
                        {row.maxPoints}
                      </td>

                      {/* Percentage */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-[#F97316]">
                          {pct}%
                        </span>
                      </td>

                      {/* Graded Date */}
                      <td className="px-5 py-4 text-xs text-slate-400 dark:text-[#8B92A5] whitespace-nowrap text-right font-medium">
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
