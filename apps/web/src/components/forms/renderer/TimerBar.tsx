"use client";

import { Clock, AlertTriangle, ShieldAlert } from "lucide-react";

interface TimerBarProps {
  secondsLeft: number | null;
  tabSwitches?: number;
}

export default function TimerBar({ secondsLeft, tabSwitches = 0 }: TimerBarProps) {
  if (secondsLeft === null && tabSwitches === 0) return null;

  const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const secs = secondsLeft !== null ? secondsLeft % 60 : 0;
  const isUrgent = secondsLeft !== null && secondsLeft < 300; // < 5 mins
  const isCritical = secondsLeft !== null && secondsLeft < 60; // < 1 min

  const formatDigits = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <div
      className={`sticky top-0 z-40 px-4 sm:px-8 py-2.5 backdrop-blur-md border-b transition-all flex items-center justify-between text-xs font-bold ${
        isCritical
          ? "bg-rose-500 text-white border-rose-600 animate-pulse"
          : isUrgent
          ? "bg-amber-500/90 text-white border-amber-600"
          : "bg-white/95 dark:bg-[#12151E]/95 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
      }`}
    >
      <div className="flex items-center gap-4">
        {secondsLeft !== null && (
          <div className="flex items-center gap-2">
            {isCritical ? (
              <AlertTriangle className="w-4 h-4 text-white" />
            ) : (
              <Clock className={`w-4 h-4 ${isUrgent ? "text-white" : "text-amber-500"}`} />
            )}
            <span>Time Remaining:</span>
            <span className="font-mono text-sm tracking-wider">
              {formatDigits(mins)}:{formatDigits(secs)}
            </span>
          </div>
        )}
      </div>

      {tabSwitches > 0 && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            isCritical || isUrgent
              ? "bg-black/20 text-white border border-white/20"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          }`}
          title="Total departures from this tab recorded during this attempt"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Tab switches: {tabSwitches}</span>
        </div>
      )}
    </div>
  );
}
