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
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
            Weekly Challenge
          </span>
          {daysLeft <= 2 && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-200 bg-red-900/30 px-2 py-1 rounded">
              <Timer className="w-3 h-3" /> Ending Soon!
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold mb-2">The Ultimate Code Optimization</h3>
        <p className="text-emerald-100 text-sm">
          Complete this shared time-boxed template to earn bonus points towards the global leaderboard. Available for {daysLeft} more days.
        </p>
      </div>

      <div>
        <Link 
          href={`/${instituteCode}/activities/codelab/${challenge.templateId}/weekly`}
          className="bg-white text-teal-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          {challenge.isOptIn ? "Opt-In & Start" : "Start Challenge"} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
