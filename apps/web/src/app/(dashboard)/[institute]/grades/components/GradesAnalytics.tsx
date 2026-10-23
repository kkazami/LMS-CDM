"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import type { PerCourseStats, TrendPoint } from "../data/grade-filter";
import type { InstituteTheme } from "@/lib/theme";

interface GradesAnalyticsProps {
  perCourseStats: PerCourseStats[];
  trendData: TrendPoint[];
  theme: InstituteTheme;
  isAllSubjects?: boolean;
}

// Custom Tooltip for the bar chart with light and dark mode support
const BarTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl px-4 py-3 text-slate-900 dark:text-[#F0F2F8]">
      <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5] mb-1">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums">{payload[0].value.toFixed(1)}%</p>
      <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-0.5">Average Grade</p>
    </div>
  );
};

// Custom Tooltip for the line chart with light and dark mode support
const LineTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint; value: number }>;
}) => {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl px-4 py-3 max-w-56 text-slate-900 dark:text-[#F0F2F8]">
      <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5] mb-1 font-mono">{pt.date}</p>
      <p className="text-sm font-semibold truncate text-slate-900 dark:text-[#F0F2F8]">{pt.itemTitle}</p>
      <p className="text-xs text-slate-400 dark:text-[#8B92A5] mb-1 font-mono">{pt.courseCode}</p>
      <p className="text-lg font-bold font-mono tabular-nums">{pt.percent.toFixed(1)}%</p>
    </div>
  );
};

export default function GradesAnalytics({
  perCourseStats,
  trendData,
  theme,
  isAllSubjects = true,
}: GradesAnalyticsProps) {
  const primary = theme.colors.primary;
  const primaryMuted = `${primary}55`;
  const gridStroke = "rgba(148, 163, 184, 0.15)";
  const tickColor = "#8B92A5";

  return (
    <div className="space-y-8">
      {/* ── Bar Chart: Average grade per course ── */}
      <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 transition-colors">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
            {isAllSubjects ? "Average Grade by Course" : "Subject Average Grade"}
          </h3>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-0.5">
            {isAllSubjects
              ? "Average percentage score across all graded items per class"
              : "Average percentage score for this subject"}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={perCourseStats.map((s) => ({
              name: s.courseCode,
              avg: s.avgPercent,
              fullTitle: s.courseTitle,
            }))}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: `${primary}14` }} />
            <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine y={90} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar
              dataKey="avg"
              fill={primary}
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-red-500 rounded-full" />
            <span className="text-xs text-slate-500 dark:text-[#8B92A5]">75% Passing threshold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 bg-emerald-500 rounded-full" />
            <span className="text-xs text-slate-500 dark:text-[#8B92A5]">90% High honors</span>
          </div>
        </div>
      </div>

      {/* ── Line Chart: Grade trend over time ── */}
      <div className="bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs p-6 transition-colors">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
            Grade Trend Over Time
          </h3>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-0.5">
            Each point is a graded submission, ordered chronologically
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trendData}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<LineTooltip />} />
            <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} />
            <Line
              type="monotone"
              dataKey="percent"
              stroke={primary}
              strokeWidth={2.5}
              dot={{ fill: primary, r: 4, strokeWidth: 0 }}
              activeDot={{ fill: primary, r: 6, stroke: primaryMuted, strokeWidth: 3 }}
              name="Grade %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
