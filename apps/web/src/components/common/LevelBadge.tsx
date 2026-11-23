"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const showDetails = showTooltip && tooltipVisible;
  const info = computeLevelInfo(exp);
  const tierConfig = TIER_CONFIG[info.tier] || TIER_CONFIG.newcomer;

  useLayoutEffect(() => {
    if (!showDetails) return;
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const margin = 8;
      const { clientWidth, clientHeight } = document.documentElement;
      const { offsetWidth, offsetHeight } = tooltip;
      if (anchor.bottom < 0 || anchor.top > clientHeight) {
        setPosition(null);
        return;
      }
      const above = anchor.top - offsetHeight - margin;
      const below = anchor.bottom + margin;
      const maxTop = Math.max(margin, clientHeight - offsetHeight - margin);
      setPosition({
        left: Math.max(margin, Math.min(anchor.left + (anchor.width - offsetWidth) / 2, clientWidth - offsetWidth - margin)),
        top: above >= margin ? above : Math.max(margin, Math.min(below, maxTop)),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { capture: true, passive: true });
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setTooltipVisible(false); };
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('keydown', dismiss);
    };
  }, [showDetails]);

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
        ref={anchorRef}
        tabIndex={showTooltip ? 0 : undefined}
        role="img"
        className={`inline-flex items-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-150 hover:border-slate-300 dark:hover:border-white/20 cursor-default select-none shadow-xs ${sizeClasses}`}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => { if (document.activeElement !== anchorRef.current) setTooltipVisible(false); }}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        aria-label={`${tierConfig.label} Tier, Level ${info.level}`}
        aria-describedby={showDetails ? tooltipId : undefined}
      >
        <span className="leading-none">{tierConfig.icon}</span>
        <span className={`font-mono leading-none ${tierConfig.color} ${tierConfig.darkColor} ${numSize}`}>
          {info.level}
        </span>
      </div>

      {/* Tooltip */}
      {showDetails && createPortal(
        <div id={tooltipId} role="tooltip" ref={tooltipRef} style={position ?? { visibility: 'hidden' }} className="pointer-events-none fixed z-[10000] w-44 max-w-[calc(100vw_-_1rem)]">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-xl dark:border-white/10 dark:bg-[#1A1D27]">
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
        </div>,
        document.body
      )}
    </div>
  );
}
