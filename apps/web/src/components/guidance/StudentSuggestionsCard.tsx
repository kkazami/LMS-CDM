/**
 * apps/web/src/components/guidance/StudentSuggestionsCard.tsx
 *
 * "Study Suggestions" card for the ITE student dashboard.
 * Renders up to 3 prioritized rule-based study suggestions based on real deadlines,
 * course activities, and weekly focus.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lightbulb,
  ArrowRight,
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { StudySuggestion } from "@/lib/ite/guidance/types";

interface StudentSuggestionsCardProps {
  theme: InstituteTheme;
  instituteCode: string;
}

const CATEGORY_ICONS = {
  OVERDUE: AlertCircle,
  DUE_SOON: Clock,
  ENGAGEMENT: Compass,
  FOCUS: Sparkles,
  ON_TRACK: CheckCircle2,
};

const CATEGORY_COLORS = {
  OVERDUE: "text-red-500 bg-red-500/10 border-red-500/20",
  DUE_SOON: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  ENGAGEMENT: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  FOCUS: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  ON_TRACK: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
};

export default function StudentSuggestionsCard({
  theme,
  instituteCode,
}: StudentSuggestionsCardProps) {
  const [suggestions, setSuggestions] = useState<StudySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadSuggestions() {
      try {
        const res = await fetch("/api/ite/guidance/suggestions");
        if (!res.ok) return;
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch (err) {
        console.warn("[StudentSuggestionsCard] Failed to load suggestions", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadSuggestions();
    return () => {
      isCancelled = true;
    };
  }, []);

  const primaryColor = theme.colors.primary || "#2563EB";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
              Study Suggestions
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-[#8B92A5]">
              Personalized guidance for your week
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#94A3B8]">
          Guidance
        </span>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : suggestions.length === 0 || suggestions.every((s) => s.category === "ON_TRACK") ? (
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-950/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              You're on track
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
              No overdue tasks or immediate deadlines. Keep your streak going and preview upcoming modules.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {suggestions.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || Lightbulb;
            const colorClass = CATEGORY_COLORS[item.category] || "text-slate-500 bg-slate-500/10";

            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all min-h-[48px]"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#8B92A5] line-clamp-2 leading-relaxed mt-0.5">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
