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
  Legend,
} from "recharts";
import type { PerCourseStats, TrendPoint } from "../hooks/useGrades";
import type { InstituteTheme } from "@/lib/theme";

interface GradesAnalyticsProps {
  perCourseStats: PerCourseStats[];
  trendData: TrendPoint[];
  theme: InstituteTheme;
}

// Custom Tooltip for the bar chart
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
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{payload[0].value.toFixed(1)}%</p>
      <p className="text-xs text-gray-400">Average Grade</p>
    </div>
  );
};

// Custom Tooltip for the line chart
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
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 max-w-50">
      <p className="text-xs font-semibold text-gray-500 mb-1">{pt.date}</p>
      <p className="text-sm font-semibold text-gray-800 truncate">{pt.itemTitle}</p>
      <p className="text-xs text-gray-400 mb-1">{pt.courseCode}</p>
      <p className="text-lg font-bold">{pt.percent.toFixed(1)}%</p>
    </div>
  );
};

export default function GradesAnalytics({
  perCourseStats,
  trendData,
  theme,
}: GradesAnalyticsProps) {
  const primary = theme.colors.primary;
  const primaryMuted = `${primary}55`;

  return (
    <div className="space-y-10">
      {/* ── Bar Chart: Average grade per course ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800">
            Average Grade by Course
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Average percentage score across all graded items per class
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
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: `${primary}0D` }} />
            <ReferenceLine y={75} stroke="#FCA5A5" strokeDasharray="4 4" />
            <ReferenceLine y={90} stroke="#6EE7B7" strokeDasharray="4 4" />
            <Bar
              dataKey="avg"
              fill={primary}
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-red-300" />
            <span className="text-xs text-gray-400">75% threshold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-emerald-300" />
            <span className="text-xs text-gray-400">90% threshold</span>
          </div>
        </div>
      </div>

      {/* ── Line Chart: Grade trend over time ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800">
            Grade Trend Over Time
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Each point is a graded submission, ordered chronologically
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trendData}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<LineTooltip />} />
            <ReferenceLine y={75} stroke="#FCA5A5" strokeDasharray="4 4" />
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
