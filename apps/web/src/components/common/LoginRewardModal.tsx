"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Flame, CheckCircle2, ArrowRight } from "lucide-react";
import { useLoginRewardStore } from "@/stores/login-reward-store";
import CountUpNumber from "@/features/interactive-activities/codelab/components/analytics/CountUpNumber";
import BadgeIcon from "@/components/common/BadgeIcon";
import { computeLevelInfo, TIER_CONFIG } from "@/lib/gamification/exp-engine";
import type { UnnotifiedBadge } from "./BadgeToast";

interface LoginRewardModalProps {
  userId?: string;
  streakCurrent?: number;
  expEarned?: number;
  totalExp?: number;
  newBadges?: UnnotifiedBadge[];
}

function getPHTDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const pht = new Date(utc + 8 * 3600000);
  return pht.toISOString().slice(0, 10);
}

export default function LoginRewardModal({
  userId = "default",
  streakCurrent = 1,
  expEarned = 10,
  totalExp = 0,
  newBadges = [],
}: LoginRewardModalProps) {
  const { shown, markShown } = useLoginRewardStore();
  const [isOpen, setIsOpen] = useState(false);

  // Safe streak display (at least Day 1)
  const displayStreak = Math.max(1, streakCurrent);

  useEffect(() => {
    // Check localStorage date in GMT+8 (PST)
    const todayPht = getPHTDateString();
    const storageKey = `gamification_daily_reward_seen_${userId}`;

    try {
      const lastSeen = localStorage.getItem(storageKey);
      if (lastSeen === todayPht) {
        return; // Already seen today in GMT+8
      }
    } catch {
      // localStorage may fail in private mode
    }

    if (!shown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        markShown();
        try {
          localStorage.setItem(storageKey, todayPht);
        } catch {
          // ignore
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shown, markShown, userId]);

  const levelInfo = computeLevelInfo(totalExp);
  const tierConfig = TIER_CONFIG[levelInfo.tier] || TIER_CONFIG.newcomer;

  function handleClose() {
    setIsOpen(false);
    try {
      const todayPht = getPHTDateString();
      localStorage.setItem(`gamification_daily_reward_seen_${userId}`, todayPht);
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const phtNow = new Date(utc + 8 * 3600000);
  const currentDayIndex = (phtNow.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-orange-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Bouncing Flame */}
        <div className="flex justify-center my-2">
          <div className="relative inline-flex items-center justify-center p-4 rounded-3xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20">
            <span className="text-6xl animate-flame-bounce select-none">🔥</span>
          </div>
        </div>

        {/* Streak Title & Message */}
        <div className="mt-4 space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight">
            Day {displayStreak} Login Streak!
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5]">
            {displayStreak >= 7
              ? "You're on fire! Unstoppable consistency."
              : "Great to see you! Keep the streak going tomorrow."}
          </p>
        </div>

        {/* EXP Reward & Level Tier Pill */}
        <div className="my-5 flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 text-sm font-black font-mono">
            <Sparkles className="w-4 h-4 text-orange-500" />
            +<CountUpNumber value={expEarned} duration={900} /> EXP
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#F0F2F8]">
            <span>{tierConfig.icon}</span>
            <span>{tierConfig.label} (Lv. {levelInfo.level})</span>
          </div>
        </div>

        {/* 7-Day Streak Calendar */}
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-[#555C72] mb-2 px-1">
            <span>Weekly Progress (Resets 12:00 AM PHT)</span>
            <span className="flex items-center gap-1 text-orange-500">
              <Flame className="w-3.5 h-3.5 fill-orange-500" /> {displayStreak} Days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {daysOfWeek.map((day, idx) => {
              const isPastOrToday = idx <= currentDayIndex;
              const isToday = idx === currentDayIndex;

              return (
                <div
                  key={day}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                    isToday
                      ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
                      : isPastOrToday
                      ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600"
                  }`}
                >
                  <span className="text-[10px] uppercase font-mono">{day}</span>
                  {isPastOrToday ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isToday ? "text-white" : "text-orange-500"}`} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* New Badge Unlocked Preview (if any) */}
        {newBadges.length > 0 && (
          <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 shrink-0">
              <BadgeIcon name={newBadges[0].definition?.iconName || "Trophy"} className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                New Badge Unlocked!
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">
                {newBadges[0].definition?.name || "Achievement"}
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 px-4 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <span>Claim & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
