"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Sparkles, ChevronUp, ChevronDown, X } from "lucide-react";

export default function FloatingStudyTimer() {
  const [secondsToday, setSecondsToday] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMinimized, setIsMobileMinimized] = useState(true);
  const [lastRewardMsg, setLastRewardMsg] = useState<string | null>(null);

  const lastActivityRef = useRef(Date.now());

  // Listen for user activity to reset AFK status (throttled to 5s to eliminate scroll jank)
  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < 5000) return;
    lastActivityRef.current = now;
    if (!isActive) setIsActive(true);
  }, [isActive]);

  useEffect(() => {
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [handleActivity]);

  // Heartbeat loop every 60 seconds
  useEffect(() => {
    const sendHeartbeat = async () => {
      // If no activity for > 3 minutes, set idle
      const idleTime = Date.now() - lastActivityRef.current;
      const userIsActive = idleTime < 180000;
      setIsActive(userIsActive);

      try {
        const res = await fetch("/api/gamification/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: userIsActive }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            ok: boolean;
            totalSecondsToday: number;
            expAwarded: number;
            milestoneLabel: string | null;
          };
          if (typeof data.totalSecondsToday === "number") {
            setSecondsToday(data.totalSecondsToday);
          }
          if (data.expAwarded > 0) {
            setLastRewardMsg(`+${data.expAwarded} EXP: ${data.milestoneLabel}`);
            setTimeout(() => setLastRewardMsg(null), 6000);
          }
        }
      } catch {
        // silent fail
      }
    };

    // Run initial tick after 5s then every 60s
    const initialTimer = setTimeout(sendHeartbeat, 5000);
    const interval = setInterval(sendHeartbeat, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const minutes = Math.floor(secondsToday / 60);
  const nextMilestoneMinutes = minutes < 15 ? 15 : minutes < 30 ? 30 : minutes < 60 ? 60 : 120;
  const progressPercent = Math.min(Math.round((minutes / nextMilestoneMinutes) * 100), 100);

  return (
    <div className="hidden lg:block fixed bottom-5 left-5 z-40">
      {/* Toast popup when reward unlocked */}
      {lastRewardMsg && (
        <div className="mb-2 p-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
          <span>{lastRewardMsg}</span>
        </div>
      )}

      {/* Mobile Minimized Pill Button */}
      {isMobileMinimized ? (
        <button
          type="button"
          onClick={() => setIsMobileMinimized(false)}
          className="lg:hidden relative flex h-10 w-10 items-center justify-center rounded-full bg-white/95 dark:bg-[#141721]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-lg cursor-pointer active:scale-95 transition-transform"
          aria-label="Expand study timer"
          title={`${minutes}m Active`}
        >
          <Timer className="w-5 h-5 text-[#F97316]" />
          <span
            className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#141721] ${
              isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
        </button>
      ) : null}

      {/* Full Timer Card (Desktop always, Mobile when expanded) */}
      <div
        className={`${
          isMobileMinimized ? "hidden lg:block" : "block"
        } bg-white/95 dark:bg-[#141721]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-2.5 transition-all duration-200`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-[#F0F2F8] hover:text-[#F97316] transition-colors cursor-pointer"
            aria-expanded={isExpanded}
            aria-label="Toggle active study timer details"
          >
            <div className="relative">
              <Timer className="w-4 h-4 text-[#F97316]" />
              <span
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                  isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
            </div>
            <span>{minutes}m Active</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Minimize button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMinimized(true)}
            className="lg:hidden rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#F0F2F8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Minimize timer"
            title="Minimize"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs w-56 animate-in fade-in duration-150">
            <div className="flex justify-between text-slate-500 dark:text-[#8B92A5]">
              <span>Next Milestone:</span>
              <span className="font-bold text-slate-900 dark:text-[#F0F2F8]">{nextMilestoneMinutes}m</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F97316] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-[#555C72]">
              <span>Status: {isActive ? "🟢 Earning EXP" : "🟡 Idle (Paused)"}</span>
              <span className="font-mono font-bold">{progressPercent}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
