"use client";

import React from "react";
import { Timer, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WeeklyChallengeCardProps {
  challenge: {
    id: string;
    templateId: string;
    courseId: string;
    endDate: Date;
    isOptIn: boolean;
  };
  instituteCode: string;
}

export function WeeklyChallengeCard({ challenge, instituteCode }: WeeklyChallengeCardProps) {
  
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 border-l-4 border-l-emerald-500 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
      {/* Soft Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20 dark:border-emerald-500/30">
            Weekly Challenge
          </span>
          {daysLeft <= 2 && (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/20 dark:border-rose-500/30">
              <Timer className="w-3.5 h-3.5" /> Ending Soon!
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]">
          The Ultimate Code Optimization
        </h3>
        <p className="text-slate-600 dark:text-[#8B92A5] text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
          Complete this shared time-boxed challenge to earn bonus points towards the global leaderboard. Available for {daysLeft} more days.
        </p>
      </div>

      <div className="relative z-10 shrink-0">
        <Link 
          href={`/${instituteCode}/activities/codelab/${challenge.templateId}/weekly`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <span>{challenge.isOptIn ? "Opt-In & Start" : "Start Challenge"}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
