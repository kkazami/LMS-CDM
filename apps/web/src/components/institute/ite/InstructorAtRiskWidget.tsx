"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Activity, ArrowRight, Loader2 } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface AtRiskEntry {
  studentId: string;
  name: string;
  courseTitle: string;
  courseId: string;
  riskLevel: "HIGH";
  reasons: { detail: string }[];
}

interface Props {
  theme: InstituteTheme;
  instituteCode: string;
}

/**
 * Instructor-only widget showing HIGH-risk students across all ITE courses.
 * Displayed on the ITE instructor dashboard.
 */
export default function InstructorAtRiskWidget({ theme, instituteCode }: Props) {
  const [entries, setEntries] = useState<AtRiskEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all HIGH risk assessments for this instructor's ITE courses
    fetch("/api/ite/instructor/at-risk-summary", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setEntries(data.entries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">At-Risk Students</p>
        </div>
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B27] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4" style={{ color: theme.colors.primary }} />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">At-Risk Students</p>
        </div>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span>✓</span> No high-risk students across your courses.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-white dark:bg-[#161B27] overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-950/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">At-Risk Students ({entries.length})</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {entries.slice(0, 6).map((e) => (
          <div key={`${e.studentId}-${e.courseId}`} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{e.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{e.courseTitle} · {e.reasons[0]?.detail}</p>
            </div>
            <Link
              href={`/${instituteCode}/courses/${e.courseId}/participation`}
              className="shrink-0 flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: theme.colors.primary }}
            >
              View <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
        {entries.length > 6 && (
          <div className="px-5 py-2">
            <p className="text-xs text-slate-400">+{entries.length - 6} more students need attention.</p>
          </div>
        )}
      </div>
    </div>
  );
}
