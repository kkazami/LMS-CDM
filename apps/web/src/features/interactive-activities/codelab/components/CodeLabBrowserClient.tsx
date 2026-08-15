"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CodeLabProblemSummary,
  DifficultyTier,
  ProblemLanguage,
} from "../problems/types";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProblemScoreInfo {
  bestScore: number;
  attempts: number;
  completed: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
}

interface CodeLabBrowserClientProps {
  institute: string;
  problems: CodeLabProblemSummary[];
  studentSeedPrefix: string;
  submissionMap: Record<string, ProblemScoreInfo>;
}

const LANGUAGE_CONFIG: Record<
  ProblemLanguage,
  { label: string; badge: string; dot: string }
> = {
  python: {
    label: "Python",
    badge: "bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A5F] dark:text-[#60A5FA]",
    dot: "bg-[#2563EB] dark:bg-[#60A5FA]",
  },
  cpp: {
    label: "C++",
    badge: "bg-[#FAF5FF] text-[#7C3AED] dark:bg-[#2D1F4E] dark:text-[#A78BFA]",
    dot: "bg-[#7C3AED] dark:bg-[#A78BFA]",
  },
  csharp: {
    label: "C#",
    badge: "bg-[#F0FDF4] text-[#059669] dark:bg-[#1A3A3A] dark:text-[#34D399]",
    dot: "bg-[#059669] dark:bg-[#34D399]",
  },
  java: {
    label: "Java",
    badge: "bg-[#FFF7ED] text-[#EA580C] dark:bg-[#3A241A] dark:text-[#FB923C]",
    dot: "bg-[#EA580C] dark:bg-[#FB923C]",
  },
  javascript: {
    label: "JavaScript",
    badge: "bg-[#FEFCE8] text-[#D97706] dark:bg-[#3A301A] dark:text-[#FCD34D]",
    dot: "bg-[#D97706] dark:bg-[#FCD34D]",
  },
  sql: {
    label: "SQL",
    badge: "bg-[#ECFDF5] text-[#047857] dark:bg-[#143528] dark:text-[#6EE7B7]",
    dot: "bg-[#047857] dark:bg-[#6EE7B7]",
  },
};

const TIER_META: Record<
  DifficultyTier,
  { label: string; levelRange: string; dot: string; pill: string }
> = {
  easy: {
    label: "Easy Tier",
    levelRange: "Levels 1–10",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  },
  intermediate: {
    label: "Medium Tier",
    levelRange: "Levels 11–20",
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  },
  hard: {
    label: "Hard Tier",
    levelRange: "Levels 21–30",
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
  },
};

export function CodeLabBrowserClient({
  institute,
  problems,
  studentSeedPrefix,
  submissionMap,
}: CodeLabBrowserClientProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (selectedLanguage !== "all" && p.language !== selectedLanguage) {
        return false;
      }
      if (selectedTier !== "all" && p.tier !== selectedTier) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesTags = p.tags.some((t) => t.toLowerCase().includes(query));
        const matchesLang = p.language.toLowerCase().includes(query);
        if (!matchesTitle && !matchesTags && !matchesLang) return false;
      }
      return true;
    });
  }, [problems, selectedLanguage, selectedTier, searchQuery]);

  const solvedCount = useMemo(() => {
    return problems.filter((p) => {
      const sub = submissionMap[p.id];
      return sub?.completed && !sub?.isRejected;
    }).length;
  }, [problems, submissionMap]);

  const totalCount = problems.length || 30;
  const progressPercent = Math.round((solvedCount / totalCount) * 100);

  const easyTierProblems = filteredProblems.filter((p) => p.tier === "easy");
  const mediumTierProblems = filteredProblems.filter((p) => p.tier === "intermediate");
  const hardTierProblems = filteredProblems.filter((p) => p.tier === "hard");

  return (
    <div className="space-y-8 max-w-7xl mx-auto page-enter">
      {/* ─── 1. Hero / Header Card ─── */}
      <div className="rounded-3xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#22263A] p-6 sm:p-8 shadow-xs border-l-4 border-l-[#F97316] relative overflow-hidden transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#F97316] text-[#F97316] bg-transparent">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ICS Exclusive Laboratory</span>
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-[#8B92A5]">
                {totalCount} Challenges
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-[#F97316] text-white shadow-md shadow-orange-500/30 shrink-0">
                <Code2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight">
                CodeLab Problem Bank
              </h1>
            </div>

            <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-2xl">
              Solve rigorous algorithmic problems across Python, C++, C#, Java, JavaScript, and SQL. Submissions run inside isolated Judge0 sandbox containers.
            </p>
          </div>

          {/* Progress & Stats Area */}
          <div className="w-full lg:w-72 bg-slate-50 dark:bg-[#1A1D27] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                  Progress
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
                  {solvedCount} / {totalCount}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                  Solved Rate
                </p>
                <p className="text-base font-black text-[#F97316]">
                  {progressPercent}%
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Search & Filter Bar ─── */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full flex items-center rounded-2xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#F97316]/20 focus-within:border-[#F97316] transition-all shadow-xs">
          <Search className="h-4 w-4 text-slate-400 dark:text-[#8B92A5] mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems by title, tag (#math, #array), or language..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-[#555C72]"
          />
        </div>

        {/* Language Filter */}
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] text-slate-700 dark:text-[#F0F2F8] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] cursor-pointer shadow-xs"
        >
          <option value="all">All Languages</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="csharp">C#</option>
          <option value="java">Java</option>
          <option value="javascript">JavaScript</option>
          <option value="sql">SQL</option>
        </select>

        {/* Tier Filter */}
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] text-slate-700 dark:text-[#F0F2F8] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] cursor-pointer shadow-xs"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy (Levels 1–10)</option>
          <option value="intermediate">Medium (Levels 11–20)</option>
          <option value="hard">Hard (Levels 21–30)</option>
        </select>
      </div>

      {/* ─── 3. Tier Sections & Problem Cards Grid ─── */}
      {filteredProblems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-12 text-center shadow-xs">
          <Code2 className="mx-auto h-12 w-12 text-slate-300 dark:text-[#555C72] mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            No challenges match your filter criteria
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8B92A5]">
            Try adjusting your search query, difficulty tier, or programming language selector.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Easy Tier */}
          {easyTierProblems.length > 0 && (
            <TierSection
              tier="easy"
              problems={easyTierProblems}
              institute={institute}
              studentSeedPrefix={studentSeedPrefix}
              submissionMap={submissionMap}
            />
          )}

          {/* Medium Tier */}
          {mediumTierProblems.length > 0 && (
            <TierSection
              tier="intermediate"
              problems={mediumTierProblems}
              institute={institute}
              studentSeedPrefix={studentSeedPrefix}
              submissionMap={submissionMap}
            />
          )}

          {/* Hard Tier */}
          {hardTierProblems.length > 0 && (
            <TierSection
              tier="hard"
              problems={hardTierProblems}
              institute={institute}
              studentSeedPrefix={studentSeedPrefix}
              submissionMap={submissionMap}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TierSection({
  tier,
  problems,
  institute,
  studentSeedPrefix,
  submissionMap,
}: {
  tier: DifficultyTier;
  problems: CodeLabProblemSummary[];
  institute: string;
  studentSeedPrefix: string;
  submissionMap: Record<string, ProblemScoreInfo>;
}) {
  const meta = TIER_META[tier];

  return (
    <div className="space-y-4">
      {/* Tier Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
            {meta.label}
          </h2>
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] font-medium">
            ({meta.levelRange})
          </span>
        </div>
        <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.07] text-slate-600 dark:text-[#8B92A5]">
          {problems.length} {problems.length === 1 ? "problem" : "problems"}
        </span>
      </div>

      {/* Grid: 3-col at >=1280px, 2-col at 768-1279px, 1-col below */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {problems.map((problem) => {
          const lang = LANGUAGE_CONFIG[problem.language];
          const sub = submissionMap[problem.id];
          const isSolved = sub?.completed && !sub?.isRejected;
          const isInvalidated = sub?.isRejected;

          return (
            <Link
              key={problem.id}
              href={`/${institute}/activities/codelab/${problem.id}/${studentSeedPrefix}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-lg dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="space-y-3">
                {/* Header Row: Language Pill, Level Badge, and Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Language Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${lang.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${lang.dot}`} />
                      <span>{lang.label}</span>
                    </span>

                    {/* Level Badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#8B92A5] border border-slate-200/80 dark:border-white/[0.06]">
                      LVL {problem.level}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isSolved ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100%</span>
                      </span>
                    ) : isInvalidated ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Invalidated</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 dark:text-[#555C72]">
                        Unattempted
                      </span>
                    )}
                  </div>
                </div>

                {/* Problem Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] group-hover:text-[#F97316] transition-colors line-clamp-2">
                  {problem.title}
                </h3>

                {/* Tags */}
                {problem.tags && problem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#8B92A5] border border-slate-200/80 dark:border-white/[0.06]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs font-semibold text-[#F97316] group-hover:underline">
                <span>Solve Challenge</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
