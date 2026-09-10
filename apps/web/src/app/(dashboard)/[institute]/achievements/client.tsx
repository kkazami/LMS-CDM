"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Search,
  CheckCircle2,
  Lock,
  Flame,
  CalendarDays,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import BadgeIcon from "@/components/common/BadgeIcon";
import {
  BADGE_CATALOG,
  getBadgeById,
  type BadgeCategory,
  type BadgeDefinition,
} from "@/lib/gamification/badge-catalog";
import {
  computeLevelInfo,
  TIER_CONFIG,
  type LevelTier,
} from "@/lib/gamification/exp-engine";

interface EarnedBadgeData {
  badgeRuleId: string;
  earnedAt: string;
}

interface AchievementsClientProps {
  instituteCode: string;
  theme: InstituteTheme;
  exp: number;
  earnedBadges: EarnedBadgeData[];
  currentStreak: number;
  totalLoginDays: number;
}

const CATEGORIES: { id: BadgeCategory | "all"; label: string }[] = [
  { id: "all", label: "All Badges" },
  { id: "learning", label: "Learning" },
  { id: "streak", label: "Streaks" },
  { id: "excellence", label: "Excellence" },
  { id: "level", label: "Level Milestones" },
  { id: "special", label: "Special & Secrets" },
];

const TIER_ORDER: LevelTier[] = [
  "newcomer",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "legend",
];

export default function AchievementsClient({
  instituteCode,
  theme,
  exp,
  earnedBadges,
  currentStreak,
  totalLoginDays,
}: AchievementsClientProps) {
  const searchParams = useSearchParams();
  const badgeQueryParam = searchParams.get("badge");

  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedBadgeId, setHighlightedBadgeId] = useState<string | null>(null);

  const levelInfo = computeLevelInfo(exp);
  const currentTierConfig = TIER_CONFIG[levelInfo.tier] || TIER_CONFIG.newcomer;

  // Auto-switch category & scroll to badge if query param present
  useEffect(() => {
    if (!badgeQueryParam) return;

    const matchedDef = getBadgeById(badgeQueryParam);
    const targetId = matchedDef?.id || badgeQueryParam;

    if (matchedDef) {
      setSelectedCategory(matchedDef.category);
    }
    setHighlightedBadgeId(targetId);

    // Scroll into view after a short tick
    const timer = setTimeout(() => {
      const el =
        document.getElementById(`badge-${targetId}`) ||
        document.getElementById(`badge-${badgeQueryParam}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 250);

    // Remove highlight after 4 seconds
    const unhighlightTimer = setTimeout(() => {
      setHighlightedBadgeId(null);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(unhighlightTimer);
    };
  }, [badgeQueryParam]);

  // Map of earned badges by ID for O(1) lookup
  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedBadgeData>();
    for (const b of earnedBadges) {
      map.set(b.badgeRuleId, b);
      const normalizedKebab = b.badgeRuleId.replace(/_/g, "-");
      map.set(normalizedKebab, b);
      const normalizedSnake = b.badgeRuleId.replace(/-/g, "_");
      map.set(normalizedSnake, b);
    }
    return map;
  }, [earnedBadges]);

  // Filtered badges
  const filteredBadges = useMemo(() => {
    return BADGE_CATALOG.filter((badge) => {
      // Category filter
      if (selectedCategory !== "all" && badge.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = badge.name.toLowerCase().includes(query);
        const matchesDesc = badge.description.toLowerCase().includes(query);
        const matchesHow = badge.howToEarn.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesHow;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const earnedCount = earnedBadges.length;
  const totalCount = BADGE_CATALOG.length;
  const totalCompletionPercent = Math.round((earnedCount / (totalCount || 1)) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${instituteCode}/profile`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <span>Achievements & Badges</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
            Track your milestones, level tiers, and earn recognition for coursework excellence.
          </p>
        </div>

        {/* Overview Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] shadow-xs">
            <Trophy className="w-4 h-4 text-[#F97316]" />
            <span>{earnedCount} / {totalCount} Badges ({totalCompletionPercent}%)</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-xs">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{currentStreak} Day Streak</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] shadow-xs">
            <CalendarDays className="w-4 h-4 text-purple-500" />
            <span>{totalLoginDays} Total Days</span>
          </div>
        </div>
      </div>

      {/* ── Tier Progression Roadmap ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Level Tier Progression
            </h2>
            <p className="text-base font-black text-slate-900 dark:text-[#F0F2F8] mt-0.5">
              Current Rank: {currentTierConfig.icon} {currentTierConfig.label} Tier (Level {levelInfo.level})
            </p>
          </div>

          <div className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
            {levelInfo.currentLevelProgress} / {levelInfo.expToNextLevel} EXP ({levelInfo.progressPercent}%) to Level {levelInfo.level + 1}
          </div>
        </div>

        {/* EXP Progress Bar */}
        <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#F97316] transition-all duration-700 ease-out"
            style={{ width: `${levelInfo.progressPercent}%` }}
          />
        </div>

        {/* Horizontal Tier Progression Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {TIER_ORDER.map((tierKey) => {
            const config = TIER_CONFIG[tierKey];
            const isCurrent = levelInfo.tier === tierKey;
            const isPast = levelInfo.level > config.maxLevel;
            const isLocked = levelInfo.level < config.minLevel;

            return (
              <div
                key={tierKey}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-center ${
                  isCurrent
                    ? "bg-orange-500/10 border-orange-500/40 animate-tier-pulse shadow-md"
                    : isPast
                    ? "bg-slate-50 dark:bg-white/5 border-emerald-500/30 dark:border-emerald-500/20"
                    : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-50"
                }`}
              >
                <div className="text-2xl select-none leading-none">{config.icon}</div>
                <span className={`text-[11px] font-bold ${isCurrent ? "text-orange-600 dark:text-orange-400 font-black" : "text-slate-700 dark:text-[#F0F2F8]"}`}>
                  {config.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-[#555C72]">
                  Lv. {config.minLevel}+
                </span>

                {/* State Indicator Pill */}
                {isPast && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Reached
                  </span>
                )}
                {isCurrent && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    ● Active
                  </span>
                )}
                {isLocked && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 dark:text-[#555C72]">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Category Filter Tabs & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20"
                    : "bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search badges..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] text-xs text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 outline-none focus:border-[#F97316] transition-colors"
          />
        </div>
      </div>

      {/* ── Badges Grid ── */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-12 text-center">
          <Trophy className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-[#F0F2F8]">No badges found</p>
          <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
            Try adjusting your search query or filter category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => {
            const earnedRecord = earnedMap.get(badge.id);
            const isEarned = Boolean(earnedRecord);
            const isSecretNotEarned = badge.isSecret && !isEarned;
            const isHighlighted =
              highlightedBadgeId === badge.id ||
              highlightedBadgeId === badge.id.replace(/-/g, "_") ||
              highlightedBadgeId === badge.id.replace(/_/g, "-");

            return (
              <BadgeCard
                key={badge.id}
                badge={badge}
                isEarned={isEarned}
                isSecretNotEarned={isSecretNotEarned}
                earnedAt={earnedRecord?.earnedAt}
                isHighlighted={isHighlighted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function BadgeCard({
  badge,
  isEarned,
  isSecretNotEarned,
  earnedAt,
  isHighlighted = false,
}: {
  badge: BadgeDefinition;
  isEarned: boolean;
  isSecretNotEarned: boolean;
  earnedAt?: string;
  isHighlighted?: boolean;
}) {
  const name = isSecretNotEarned ? "???" : badge.name;
  const description = isSecretNotEarned
    ? "A mysterious hidden achievement..."
    : badge.description;
  const howToEarn = isSecretNotEarned
    ? "Keep exploring and experimenting to discover this secret."
    : badge.howToEarn;

  const formattedEarnDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      id={`badge-${badge.id}`}
      className={`relative flex flex-col justify-between p-5 rounded-3xl border transition-all duration-300 ${
        isHighlighted
          ? "ring-4 ring-orange-500 border-orange-500 shadow-2xl scale-[1.02] bg-orange-500/5 dark:bg-orange-500/10"
          : isEarned
          ? "bg-white dark:bg-[#141721] border-emerald-500/30 dark:border-emerald-500/20 shadow-xs hover:border-emerald-500/50"
          : isSecretNotEarned
          ? "bg-slate-50/40 dark:bg-white/[0.02] border-slate-200/40 dark:border-white/5 opacity-60"
          : "bg-white dark:bg-[#141721] border-slate-200/80 dark:border-white/5 shadow-xs opacity-85 hover:opacity-100"
      }`}
    >
      <div className="space-y-3">
        {/* Card Header: Icon + Earned Badge Pill */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={`p-3 rounded-2xl transition-all ${
              isEarned
                ? badge.bgColor
                : "bg-slate-100 dark:bg-white/5 grayscale opacity-50"
            }`}
          >
            {isSecretNotEarned ? (
              <Lock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            ) : (
              <BadgeIcon
                name={badge.iconName}
                className={`w-6 h-6 ${
                  isEarned
                    ? `${badge.color} ${badge.darkColor}`
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
            )}
          </div>

          {isEarned ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Earned
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[#94A3B8] text-[10px] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3" /> Not Earned
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-1.5">
            <span>{name}</span>
            {badge.isSecret && isEarned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                Secret Revealed
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Footer: How to Earn / Earn Date */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px]">
        {isEarned ? (
          <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] font-mono">
            <span>Earned on:</span>
            <span className="font-bold text-slate-700 dark:text-[#F0F2F8]">{formattedEarnDate}</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-[#94A3B8]">
              How to earn:
            </span>
            <p className="text-slate-600 dark:text-[#8B92A5] font-medium leading-tight">
              {howToEarn}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
