"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Activity,
  Loader2,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { RiskReason } from "@/lib/ite/risk-service";
import type { EngagementTrend, DailyActivityPoint } from "@/lib/ite/engagement-service";
import type { RiskLevel } from "@prisma/client";

interface CourseParticipation {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  engagementScore: number;
  trend: EngagementTrend;
  dailySeries: DailyActivityPoint[];
  onTimeRate: number | null;
  riskLevel: RiskLevel;
  reasons: RiskReason[];
  lastActivityAt: string | null;
  hasEnoughData: boolean;
}

interface Props {
  theme: InstituteTheme;
  instituteCode: string;
}

function TrendIcon({ trend }: { trend: EngagementTrend }) {
  if (trend === "UP") return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === "DOWN") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-slate-400" />;
}

function MiniSparkline({ series, color }: { series: DailyActivityPoint[]; color: string }) {
  if (!series || series.length < 2) return null;
  const max = Math.max(...series.map((p) => p.count), 1);
  const w = 80, h = 24;
  const pts = series.map((p, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - (p.count / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function tipsFromReasons(reasons: RiskReason[]): string[] {
  const tips: string[] = [];
  for (const r of reasons.slice(0, 3)) {
    if (r.code === "OVERDUE_TASKS") tips.push("Submit your pending tasks to get back on track.");
    if (r.code === "INACTIVE") tips.push("Log in and review your course materials regularly.");
    if (r.code === "LOW_GRADE") tips.push("Review graded items and ask your instructor for feedback.");
    if (r.code === "LOW_ENGAGEMENT") tips.push("Try completing a quiz or flashcard review today.");
  }
  return [...new Set(tips)].slice(0, 3);
}

export default function StudentParticipationCard({ theme, instituteCode }: Props) {
  const [courses, setCourses] = useState<CourseParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ite/students/my-participation", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setCourses(data.courses ?? []);
      })
      .catch(() => setError("Could not load participation data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">My Participation</p>
        </div>
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      </div>
    );
  }

  if (error || courses.length === 0) {
    return null; // Silently hide if no ITE courses
  }

  // Find any at-risk courses
  const atRiskCourses = courses.filter((c) => c.riskLevel === "HIGH" || c.riskLevel === "MEDIUM");

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: theme.colors.primary }} />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">My Participation</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* At-risk banner */}
        {atRiskCourses.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-2">
            {atRiskCourses.map((c) => (
              <div key={c.courseId} className="text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  {c.riskLevel === "HIGH" ? <AlertTriangle className="inline h-3.5 w-3.5 mr-1" /> : <AlertCircle className="inline h-3.5 w-3.5 mr-1" />}
                  {c.courseTitle}:
                </span>{" "}
                <span className="text-amber-700 dark:text-amber-400">
                  {c.reasons[0]?.detail ?? "Your engagement needs attention."}
                </span>{" "}
                <Link
                  href={`/${instituteCode}/courses/${c.courseId}/classwork`}
                  className="font-medium underline hover:text-amber-900 dark:hover:text-amber-200 text-amber-800 dark:text-amber-300 ml-1 inline-flex items-center gap-0.5"
                >
                  View tasks &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Per-course engagement scores */}
        {courses.map((c) => {
          const tips = tipsFromReasons(c.reasons);
          return (
            <div key={c.courseId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.courseTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.courseCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MiniSparkline series={c.dailySeries} color={theme.colors.primary} />
                  <TrendIcon trend={c.trend} />
                </div>
              </div>

              {!c.hasEnoughData ? (
                <p className="text-xs text-slate-400 italic">
                  Keep going: we need a few more days of activity to show your progress.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 dark:bg-white/10 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${c.engagementScore}%`, backgroundColor: theme.colors.primary }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white w-12 text-right">
                      {c.engagementScore}/100
                    </span>
                  </div>

                  {c.onTimeRate !== null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      On-time submissions: <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(c.onTimeRate)}%</span>
                    </p>
                  )}

                  {tips.length > 0 && (
                    <ul className="space-y-0.5">
                      {tips.map((tip) => (
                        <li key={tip} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                          <span className="mt-0.5" style={{ color: theme.colors.primary }}>›</span> {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
