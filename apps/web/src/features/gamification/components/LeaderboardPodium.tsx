"use client";

import UserAvatar from "@/components/common/UserAvatar";
import LevelBadge from "@/components/common/LevelBadge";
import CountUpNumber from "@/features/interactive-activities/codelab/components/analytics/CountUpNumber";
import { Flame, Trophy } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

export interface PodiumStudent {
  rank: number;
  studentId: string;
  name: string;
  avatarUrl: string | null;
  department: string;
  exp: number;
  level: number;
  levelTier: string;
  streak: number;
  badgeCount: number;
  isSelf: boolean;
  isAnonymized: boolean;
}

interface LeaderboardPodiumProps {
  top3: PodiumStudent[];
  theme: InstituteTheme;
}

export default function LeaderboardPodium({ top3, theme }: LeaderboardPodiumProps) {
  const first = top3.find((s) => s.rank === 1);
  const second = top3.find((s) => s.rank === 2);
  const third = top3.find((s) => s.rank === 3);

  if (!first) return null;

  return (
    <div className="pt-8 pb-4 px-2">
      <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto">
        {/* ── #2 Second Place (Left) ── */}
        {second ? (
          <PodiumCard
            student={second}
            theme={theme}
            pedestalHeight="h-44 sm:h-52"
            badgeBg="bg-slate-200 dark:bg-slate-700/60"
            badgeText="text-slate-700 dark:text-slate-200"
            medalEmoji="🥈"
            pedestalBg="bg-gradient-to-t from-slate-200/90 to-slate-100/90 dark:from-[#1E2235] dark:to-[#171B2B]"
            pedestalBorder="border-slate-300 dark:border-white/10"
            orderClass="order-1"
          />
        ) : (
          <div className="flex-1 order-1" />
        )}

        {/* ── #1 First Place (Center, Elevated) ── */}
        {first && (
          <PodiumCard
            student={first}
            theme={theme}
            pedestalHeight="h-56 sm:h-64"
            badgeBg="bg-amber-400 text-amber-950 font-black shadow-lg shadow-amber-500/30"
            badgeText="text-amber-950"
            medalEmoji="👑"
            pedestalBg="bg-gradient-to-t from-amber-500/20 via-orange-500/10 to-white dark:to-[#1A1D27]"
            pedestalBorder="border-amber-500/40 dark:border-amber-500/30"
            orderClass="order-2"
            isWinner
          />
        )}

        {/* ── #3 Third Place (Right) ── */}
        {third ? (
          <PodiumCard
            student={third}
            theme={theme}
            pedestalHeight="h-36 sm:h-44"
            badgeBg="bg-amber-700/20 text-amber-800 dark:text-amber-400"
            badgeText="text-amber-800 dark:text-amber-400"
            medalEmoji="🥉"
            pedestalBg="bg-gradient-to-t from-amber-900/10 to-slate-100/90 dark:from-[#1A1D2B] dark:to-[#141721]"
            pedestalBorder="border-amber-700/20 dark:border-white/5"
            orderClass="order-3"
          />
        ) : (
          <div className="flex-1 order-3" />
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  student,
  theme,
  pedestalHeight,
  badgeBg,
  medalEmoji,
  pedestalBg,
  pedestalBorder,
  orderClass,
  isWinner = false,
}: {
  student: PodiumStudent;
  theme: InstituteTheme;
  pedestalHeight: string;
  badgeBg: string;
  badgeText: string;
  medalEmoji: string;
  pedestalBg: string;
  pedestalBorder: string;
  orderClass: string;
  isWinner?: boolean;
}) {
  return (
    <div className={`flex-1 flex flex-col items-center max-w-[190px] ${orderClass}`}>
      {/* Avatar + Rank Badge */}
      <div className="relative mb-3 flex flex-col items-center">
        {isWinner && (
          <span className="text-2xl -mb-1 animate-bounce select-none">👑</span>
        )}

        <div
          className={`relative p-1 rounded-full bg-white dark:bg-[#141721] ring-2 shadow-lg transition-transform hover:scale-105 ${
            isWinner
              ? "ring-amber-500 ring-offset-2 ring-offset-amber-500/20"
              : student.rank === 2
              ? "ring-slate-400"
              : "ring-amber-700"
          }`}
        >
          <UserAvatar
            name={student.name}
            avatarUrl={student.avatarUrl}
            size={isWinner ? "lg" : "md"}
            color={theme.colors.primary}
          />
        </div>

        {/* Rank Badge Pill */}
        <span
          className={`-mt-3 px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-0.5 shadow-md ${badgeBg}`}
        >
          <span>{medalEmoji}</span>
          <span>#{student.rank}</span>
        </span>
      </div>

      {/* Student Details */}
      <div className="w-full text-center space-y-1 mb-2 px-1">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-[#F0F2F8] truncate">
          {student.name}
        </h3>
        <div className="flex items-center justify-center gap-1">
          <LevelBadge exp={student.exp} size="sm" />
        </div>
      </div>

      {/* Pedestal Block */}
      <div
        className={`w-full ${pedestalHeight} rounded-t-3xl border-t border-x ${pedestalBorder} ${pedestalBg} flex flex-col items-center justify-start pt-4 px-2 text-center shadow-lg transition-all`}
      >
        <div className="space-y-1">
          <div className="text-xs sm:text-sm font-black font-mono text-[#F97316]">
            <CountUpNumber value={student.exp} duration={1000} /> EXP
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-[#8B92A5] font-semibold">
            <span className="inline-flex items-center gap-0.5">
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
              {student.streak}d
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5">
              <Trophy className="w-3 h-3 text-amber-500" />
              {student.badgeCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
