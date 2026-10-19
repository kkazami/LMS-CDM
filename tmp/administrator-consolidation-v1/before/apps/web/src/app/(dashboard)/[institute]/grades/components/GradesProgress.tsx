"use client";

import type { PerCourseStats } from "../hooks/useGrades";
import type { GradeRow } from "../types";
import type { InstituteTheme } from "@/lib/theme";

interface GradesProgressProps {
  gpa: number;
  letterGrade: string;
  perCourseStats: PerCourseStats[];
  allRows: GradeRow[];
  theme: InstituteTheme;
}

// ── SVG Radial GPA Arc ──
interface RadialGPAProps {
  gpa: number;        // 0.00–4.00
  color: string;
}

function RadialGPA({ gpa, color }: RadialGPAProps) {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = gpa / 4.0; // 0–1
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#F3F4F6"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

function getProgressBarColor(pct: number): string {
  if (pct >= 90) return "#10B981"; // emerald
  if (pct >= 75) return "#F59E0B"; // amber
  return "#EF4444";               // red
}

function formatDateLabel(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GradesProgress({
  gpa,
  letterGrade,
  perCourseStats,
  allRows,
  theme,
}: GradesProgressProps) {
  // Milestone: last 4 graded items as milestones
  const milestones = [...allRows]
    .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
    .slice(0, 6);

  const overallAvg =
    allRows.length === 0
      ? 0
      : allRows.reduce((s, r) => s + (r.grade / r.maxPoints) * 100, 0) / allRows.length;

  return (
    <div className="space-y-8">
      {/* ── Top row: GPA card + Overall avg ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* GPA Radial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Cumulative GPA
          </h3>
          <div className="relative">
            <RadialGPA gpa={gpa} color={theme.colors.primary} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <span
                className="text-3xl font-bold"
                style={{ color: theme.colors.primary }}
              >
                {gpa.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 font-medium">/ 4.00</span>
            </div>
          </div>
          <p className="mt-4 text-base font-semibold text-gray-700">
            Letter Grade:{" "}
            <span style={{ color: theme.colors.primary }}>{letterGrade}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Based on {allRows.length} graded item{allRows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Overall % card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Overall Average
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-5xl font-bold"
                style={{ color: theme.colors.primary }}
              >
                {overallAvg.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Across {perCourseStats.length} class
                {perCourseStats.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, overallAvg)}%`,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-course progress bars ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-5">
          Completion by Class
        </h3>
        <div className="space-y-5">
          {perCourseStats.map((stat) => {
            const barColor = getProgressBarColor(stat.avgPercent);
            return (
              <div key={stat.courseId}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {stat.courseCode}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 truncate">
                      {stat.courseTitle}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold ml-4 shrink-0"
                    style={{ color: barColor }}
                  >
                    {stat.avgPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, stat.avgPercent)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {stat.itemCount} graded item{stat.itemCount !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent milestones ── */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-5">
            Recent Milestones
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {milestones.map((row) => {
                  const pct = Math.round((row.grade / row.maxPoints) * 100 * 10) / 10;
                  const color = getProgressBarColor(pct);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4 text-sm text-gray-700 font-medium max-w-40 truncate">
                        {row.itemTitle}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-500">
                        {row.courseCode}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-sm font-bold"
                          style={{ color }}
                        >
                          {pct}%
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({row.grade}/{row.maxPoints})
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
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
