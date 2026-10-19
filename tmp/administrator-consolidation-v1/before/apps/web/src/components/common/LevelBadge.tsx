"use client";

import { useState } from "react";
import { computeLevelInfo, TIER_CONFIG } from "@/lib/gamification/exp-engine";

interface LevelBadgeProps {
  exp: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export default function LevelBadge({
  exp,
  size = "sm",
  showTooltip = true,
  className = "",
}: LevelBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const info = computeLevelInfo(exp);
  const tierConfig = TIER_CONFIG[info.tier] || TIER_CONFIG.newcomer;

  const sizeClasses =
    size === "lg"
      ? "px-2.5 py-1 text-sm gap-1.5"
      : size === "md"
      ? "px-2 py-0.5 text-xs gap-1"
      : "px-1.5 py-0.5 text-[11px] gap-1";

  const numSize =
    size === "lg"
      ? "text-xs font-black"
      : size === "md"
      ? "text-[11px] font-black"
      : "text-[10px] font-black";

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div
        tabIndex={0}
        role="img"
        className={`inline-flex items-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-150 hover:border-slate-300 dark:hover:border-white/20 cursor-default select-none shadow-xs ${sizeClasses}`}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        aria-label={`${tierConfig.label} Tier, Level ${info.level}`}
      >
        <span className="leading-none">{tierConfig.icon}</span>
        <span className={`font-mono leading-none ${tierConfig.color} ${tierConfig.darkColor} ${numSize}`}>
          {info.level}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-none">
          <div className="bg-white dark:bg-[#1A1D27] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl px-3.5 py-3 min-w-[170px] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{tierConfig.icon}</span>
              <div>
                <div className={`text-xs font-black leading-tight ${tierConfig.color} ${tierConfig.darkColor}`}>
                  {tierConfig.label} Tier
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-[#8B92A5]">
                  Level {info.level}
                </div>
              </div>
            </div>

            {/* EXP Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-[#8B92A5] font-mono">
                <span>{info.currentLevelProgress} EXP</span>
                <span>{info.expToNextLevel} EXP</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#F97316] transition-all duration-500 ease-out"
                  style={{ width: `${info.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-[#8B92A5] text-center font-medium">
              {info.expToNextLevel - info.currentLevelProgress} EXP to Level {info.level + 1}
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-200 dark:border-t-white/10" />
        </div>
      )}
    </div>
  );
}
