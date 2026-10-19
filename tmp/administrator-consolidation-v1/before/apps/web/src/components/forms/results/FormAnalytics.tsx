"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, Award, Percent, TrendingUp, AlertTriangle } from "lucide-react";
import type { FormAnalyticsData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface FormAnalyticsProps {
  analytics: FormAnalyticsData;
  theme?: InstituteTheme;
}

export default function FormAnalytics({ analytics, theme }: FormAnalyticsProps) {
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Users className="w-4 h-4 text-primary" />
            <span>Responses</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {analytics.totalAttempts}
          </div>
          <div className="text-[10px] text-slate-400">
            {analytics.uniqueStudents} unique students
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Average Score</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {analytics.averageScore}%
          </div>
          <div className="text-[10px] text-slate-400">
            Median: {analytics.medianScore}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Percent className="w-4 h-4 text-emerald-500" />
            <span>Passing Rate</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {analytics.passingRate}%
          </div>
          <div className="text-[10px] text-slate-400">Passing criteria met</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Score Range</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {analytics.lowestScore}% - {analytics.highestScore}%
          </div>
          <div className="text-[10px] text-slate-400">Min to max recorded</div>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Score Distribution
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E293B",
                  borderColor: "transparent",
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {analytics.scoreDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index >= 3 ? "#10B981" : index === 2 ? primaryColor : "#F43F5E"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Question Difficulty Analytics */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Question Performance & Difficulty
        </h3>
        <div className="space-y-3">
          {analytics.questions.map((q, idx) => {
            const isStruggle = q.difficultyPercent >= 50;

            return (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Question {idx + 1} • {q.questionType.replace("_", " ")}
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {q.prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStruggle && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>High Difficulty</span>
                      </span>
                    )}
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      {q.answeredCount > 0 ? `${Math.round((q.correctCount / q.answeredCount) * 100)}% Correct` : "0%"}
                    </span>
                  </div>
                </div>

                {/* Performance progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
                  <div
                    style={{
                      width: `${q.answeredCount > 0 ? (q.correctCount / q.answeredCount) * 100 : 0}%`,
                    }}
                    className="h-full bg-emerald-500"
                  />
                  <div
                    style={{
                      width: `${q.answeredCount > 0 ? (1 - q.correctCount / q.answeredCount) * 100 : 0}%`,
                    }}
                    className="h-full bg-rose-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
