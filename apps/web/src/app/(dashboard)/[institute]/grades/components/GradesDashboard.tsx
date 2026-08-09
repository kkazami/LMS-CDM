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

type SortKey = "itemTitle" | "itemType" | "courseCode" | "grade" | "maxPoints" | "percent";
type SortDir = "asc" | "desc";

function getPercent(row: GradeRow): number {
  return Math.round((row.grade / row.maxPoints) * 100 * 10) / 10;
}

function gradeColor(pct: number): { bg: string; text: string } {
  if (pct >= 90) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (pct >= 75) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-red-50", text: "text-red-600" };
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
  primary: string;
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, primary }: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: isActive ? primary : "#6B7280" }}>{label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" style={{ color: primary }} />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" style={{ color: primary }} />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
        )}
      </div>
    </th>
  );
}

export default function GradesDashboard({
  allRows,
  enrolledCourses,
  theme,
  selectedCourseId,
  onCourseChange,
}: GradesDashboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("gradedAt" as SortKey);
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
    <div>
      {/* Filter + summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <select
          id="grades-course-filter"
          value={selectedCourseId}
          onChange={(e) => onCourseChange(e.target.value)}
          className="min-w-[200px] px-4 py-2.5 text-sm font-medium bg-white border rounded-full appearance-none cursor-pointer transition-all focus:outline-none"
          style={{ borderColor: theme.colors.border, color: theme.colors.text }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <option value="all">All classes</option>
          {enrolledCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.code}
            </option>
          ))}
        </select>

        {filteredRows.length > 0 && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Items</p>
              <p className="text-xl font-bold text-gray-800">{filteredRows.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Average</p>
              <p
                className="text-xl font-bold"
                style={{ color: theme.colors.primary }}
              >
                {avgPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No graded items yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Grades will appear here once your instructor has graded your submissions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortHeader
                  label="Assignment / Quiz"
                  sortKey="itemTitle"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <SortHeader
                  label="Type"
                  sortKey="itemType"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <SortHeader
                  label="Course"
                  sortKey="courseCode"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <SortHeader
                  label="Score"
                  sortKey="grade"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <SortHeader
                  label="Max"
                  sortKey="maxPoints"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <SortHeader
                  label="%"
                  sortKey="percent"
                  currentKey={sortKey as SortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  primary={theme.colors.primary}
                />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Graded
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedRows.map((row) => {
                const pct = getPercent(row);
                const { bg, text } = gradeColor(pct);
                const Icon = row.itemType === "ASSIGNMENT" ? ClipboardList : BookOpenCheck;
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center justify-center h-8 w-8 rounded-full shrink-0"
                          style={{ backgroundColor: `${theme.colors.primary}1A`, color: theme.colors.primary }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                          {row.itemTitle}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {row.itemType === "ASSIGNMENT" ? "Assignment" : "Quiz"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700 font-medium">{row.courseCode}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{row.courseTitle}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">
                      {row.grade}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {row.maxPoints}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(row.gradedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
