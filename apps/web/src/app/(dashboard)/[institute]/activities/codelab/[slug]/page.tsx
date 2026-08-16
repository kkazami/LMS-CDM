/**
 * CodeLab Track Detail Page (Levels 1–30)
 * Route: /[institute]/activities/codelab/[slug] (where slug is a language: python, cpp, etc.)
 *
 * Shows the 30 progressive levels for a specific language track,
 * organized into 3 learning stages:
 *   - Basics (Levels 1–10)
 *   - Building Up (Levels 11–20)
 *   - Getting Good (Levels 21–30)
 *
 * Sequential locking: Level N requires score >= 60 on Level N-1.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import {
  ProblemLanguage,
  LANGUAGE_LABELS,
  isLevelUnlocked,
} from "@/features/interactive-activities/codelab/problems/types";
import { getTrackLevels } from "@/features/interactive-activities/codelab/problems";
import { LANGUAGE_LOGO_MAP } from "@/features/interactive-activities/codelab/components/LanguageLogos";
import {
  ChevronLeft,
  Lock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface TrackDetailPageProps {
  params: Promise<{ institute: string; slug: string }>;
}

const VALID_LANGUAGES = new Set<ProblemLanguage>([
  "python",
  "cpp",
  "csharp",
  "java",
  "javascript",
  "sql",
  "html",
  "css",
]);

const LANGUAGE_THEMES: Record<ProblemLanguage, {
  borderColor: string;
  badgeClasses: string;
  ambientGlow: string;
  iconColor: string;
}> = {
  python: {
    borderColor: "border-l-[#3776AB]",
    badgeClasses: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    ambientGlow: "from-blue-500/15 via-yellow-500/10 to-transparent",
    iconColor: "text-[#3776AB] dark:text-[#60A5FA]",
  },
  cpp: {
    borderColor: "border-l-[#00599C]",
    badgeClasses: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    ambientGlow: "from-blue-600/15 via-indigo-500/10 to-transparent",
    iconColor: "text-[#00599C] dark:text-[#60A5FA]",
  },
  csharp: {
    borderColor: "border-l-[#9B4F96]",
    badgeClasses: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30",
    ambientGlow: "from-purple-500/15 via-violet-500/10 to-transparent",
    iconColor: "text-[#9B4F96] dark:text-[#C084FC]",
  },
  java: {
    borderColor: "border-l-[#EA580C]",
    badgeClasses: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20 dark:border-orange-500/30",
    ambientGlow: "from-orange-500/15 via-amber-500/10 to-transparent",
    iconColor: "text-[#EA580C] dark:text-[#FB923C]",
  },
  javascript: {
    borderColor: "border-l-[#EAB308]",
    badgeClasses: "bg-yellow-500/15 dark:bg-yellow-500/20 text-amber-800 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/30",
    ambientGlow: "from-yellow-500/15 via-amber-500/10 to-transparent",
    iconColor: "text-[#D97706] dark:text-[#FCD34D]",
  },
  sql: {
    borderColor: "border-l-[#0EA5E9]",
    badgeClasses: "bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/20 dark:border-sky-500/30",
    ambientGlow: "from-sky-500/15 via-blue-500/10 to-transparent",
    iconColor: "text-[#0284C7] dark:text-[#38BDF8]",
  },
  html: {
    borderColor: "border-l-[#E44D26]",
    badgeClasses: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
    ambientGlow: "from-rose-500/15 via-orange-500/10 to-transparent",
    iconColor: "text-[#E11D48] dark:text-[#FB7185]",
  },
  css: {
    borderColor: "border-l-[#1572B6]",
    badgeClasses: "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/30",
    ambientGlow: "from-cyan-500/15 via-blue-500/10 to-transparent",
    iconColor: "text-[#0891B2] dark:text-[#22D3EE]",
  },
};

export default async function CodeLabTrackDetailPage({ params }: TrackDetailPageProps) {
  const { institute, slug: rawLanguage } = await params;
  const language = rawLanguage.toLowerCase() as ProblemLanguage;

  if (!VALID_LANGUAGES.has(language)) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Enforce ICS-only guard
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role,
      instituteId: session.user.instituteId,
    },
  });

  if (!eligible || !isEligibleInstituteCode(institute)) {
    notFound();
  }

  // 2. Fetch student submissions for this track
  const submissions = await db.activitySubmission.findMany({
    where: {
      studentId: session.user.id,
      activityType: "codelab",
    },
    select: {
      score: true,
      stateCheck: true,
      templateId: true,
    },
  });

  const scores: Record<number, number> = {};
  for (const sub of submissions) {
    if (!sub.stateCheck) continue;
    try {
      const state = JSON.parse(sub.stateCheck) as Record<string, unknown>;
      let lang = state.language as string | undefined;
      let level = Number(state.level);

      if (!lang && sub.templateId) {
        const match = sub.templateId.match(/^([a-z0-9]+)-level-(\d+)$/i);
        if (match) {
          lang = match[1].toLowerCase();
          level = parseInt(match[2], 10);
        }
      }

      if (lang === language && !isNaN(level) && level >= 1 && level <= 30) {
        const existing = scores[level] ?? 0;
        scores[level] = Math.max(existing, sub.score);
      }
    } catch {
      // ignore
    }
  }

  const highestPassed = Object.entries(scores)
    .filter(([, score]) => score >= 60)
    .map(([lvl]) => parseInt(lvl, 10))
    .reduce((max, lvl) => Math.max(max, lvl), 0);

  const problems = getTrackLevels(language);
  const langLabel = LANGUAGE_LABELS[language] || language;
  const langTheme = LANGUAGE_THEMES[language] || LANGUAGE_THEMES.python;
  const LanguageLogo = LANGUAGE_LOGO_MAP[language];

  // Split into 3 stages
  const basics = problems.filter((p) => p.level <= 10);
  const buildingUp = problems.filter((p) => p.level > 10 && p.level <= 20);
  const gettingGood = problems.filter((p) => p.level > 20);

  const renderLevelCard = (problem: import("@/features/interactive-activities/codelab/problems/types").CodeLabProblem) => {
    const levelNum = problem.level;
    const score = scores[levelNum];
    const isPassed = typeof score === "number" && score >= 60;
    const isUnlocked = isLevelUnlocked(levelNum, highestPassed);
    const isCurrent = isUnlocked && !isPassed;

    if (!isUnlocked) {
      return (
        <div
          key={problem.id}
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#141721]/50 border border-slate-200/60 dark:border-white/5 text-slate-400 dark:text-[#555C72] opacity-75 cursor-not-allowed select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-[#1E2132] flex items-center justify-center text-slate-500 dark:text-[#8B92A5] font-mono text-xs font-bold">
              {levelNum}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] truncate max-w-[180px] sm:max-w-xs">
                {problem.title}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-[#555C72]">Locked</span>
            </div>
          </div>
          <Lock className="w-4 h-4 text-slate-400 dark:text-[#555C72] shrink-0" />
        </div>
      );
    }

    return (
      <Link
        key={problem.id}
        href={`/${institute}/activities/codelab/${language}/${levelNum}`}
        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
          isPassed
            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500/40 shadow-xs"
            : isCurrent
            ? "bg-white dark:bg-[#141721] border-[#F97316] ring-2 ring-orange-500/20 shadow-md hover:-translate-y-0.5"
            : "bg-white dark:bg-[#141721] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              isPassed
                ? "bg-emerald-500 text-white"
                : isCurrent
                ? "bg-[#F97316] text-white animate-pulse"
                : "bg-slate-100 dark:bg-[#1E2132] text-slate-700 dark:text-[#F0F2F8]"
            }`}
          >
            {isPassed ? <CheckCircle2 className="w-4 h-4" /> : levelNum}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate max-w-[180px] sm:max-w-xs group-hover:text-[#F97316] transition-colors">
              {problem.title}
            </div>
            <div className={`text-[10px] font-mono ${isPassed ? "text-emerald-700 dark:text-emerald-400 font-semibold" : isCurrent ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-slate-400 dark:text-[#8B92A5]"}`}>
              {isPassed ? `Best: ${score}%` : isCurrent ? "Next Challenge" : "Unlocked"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-[#F97316] transition-colors shrink-0">
          <span>{isPassed ? "Review" : "Start"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8 pb-12 page-enter max-w-7xl mx-auto">
      {/* ─── 1. Top Breadcrumb & Stats ─── */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${institute}/activities/codelab`}
          className="group inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] bg-white dark:bg-[#141721] hover:bg-slate-50 dark:hover:bg-[#181B26] px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Tracks</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] bg-white dark:bg-[#141721] px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <Trophy className="w-4 h-4 text-[#F97316]" />
          <span>{highestPassed} of 30 Completed</span>
        </div>
      </div>

      {/* ─── 2. Track Header Banner (Dual-Theme Light & Dark) ─── */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 border-l-4 ${langTheme.borderColor} shadow-xs transition-colors`}
      >
        {/* Soft Ambient Language Glow */}
        <div
          className={`absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-gradient-to-br ${langTheme.ambientGlow} rounded-full blur-3xl pointer-events-none`}
        />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-gradient-to-tr from-slate-200/40 dark:from-white/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Floating Language Watermark Logo in Corner */}
        {LanguageLogo && (
          <div
            className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 opacity-15 dark:opacity-10 pointer-events-none"
            aria-hidden="true"
          >
            <LanguageLogo size={120} />
          </div>
        )}

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${langTheme.badgeClasses}`}>
            <BookOpen className={`w-3.5 h-3.5 ${langTheme.iconColor}`} />
            <span>{langLabel} Track</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]">
            {langLabel} Curriculum — 30 Levels
          </h1>
          <p className="text-slate-600 dark:text-[#8B92A5] text-xs sm:text-sm font-normal leading-relaxed">
            Pass each level with score ≥ 60% to unlock the next level in sequence. Practice real-world programming challenges with automated validation.
          </p>
        </div>
      </div>

      {/* ─── Stage 1: Basics (Levels 1–10) ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
          <h2>Basics (Levels 1–10)</h2>
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-normal">• Core syntax and fundamentals</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {basics.map(renderLevelCard)}
        </div>
      </section>

      {/* ─── Stage 2: Building Up (Levels 11–20) ─── */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
          <h2>Building Up (Levels 11–20)</h2>
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-normal">• Data structures and methods</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {buildingUp.map(renderLevelCard)}
        </div>
      </section>

      {/* ─── Stage 3: Getting Good (Levels 21–30) ─── */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
          <h2>Getting Good (Levels 21–30)</h2>
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-normal">• Algorithms and advanced patterns</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {gettingGood.map(renderLevelCard)}
        </div>
      </section>
    </div>
  );
}
