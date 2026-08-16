"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";

interface PomodoroTimerProps {
  courseId: string;
  syllabusItemId: string;
}

export default function PomodoroTimer({ courseId, syllabusItemId }: PomodoroTimerProps) {
  const [targetTimeMinutes, setTargetTimeMinutes] = useState(25);
  const [timeElapsed, setTimeElapsed] = useState(0); // counts up from 0
  const [isActive, setIsActive] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop and finish when target time is reached
  useEffect(() => {
    if (isActive && timeElapsed >= targetTimeMinutes * 60) {
      finishSession();
    }
  }, [timeElapsed, isActive, targetTimeMinutes]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => {
    if (!isActive && !sessionStartedAt) {
      setSessionStartedAt(new Date());
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeElapsed(0);
    setSessionStartedAt(null);
  };

  const finishSession = async () => {
    if (timeElapsed > 0 && sessionStartedAt) {
      setIsActive(false);
      await logStudySession(timeElapsed);
      setTimeElapsed(0);
      setSessionStartedAt(null);
    }
  };

  const logStudySession = async (durationSeconds: number) => {
    setIsLogging(true);
    try {
      const completedAt = new Date();
      await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          syllabusItemId,
          durationSeconds,
          startedAt: sessionStartedAt,
          completedAt,
        }),
      });
    } catch (err) {
      console.error("Failed to log study session", err);
    } finally {
      setIsLogging(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const remainingSeconds = Math.max(0, targetTimeMinutes * 60 - timeElapsed);
  const progressPercentage = (timeElapsed / (targetTimeMinutes * 60)) * 100;

  return (
    <div className="rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden flex flex-col transition-all duration-500 relative">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-3xl opacity-20 rounded-full transition-colors duration-1000 bg-[#F97316]" />

      {/* Timer Display */}
      <div className="p-8 pb-4 flex flex-col items-center justify-center relative z-10">
        <div className="relative w-52 h-52 flex items-center justify-center group">
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform drop-shadow-sm" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              className="text-slate-100 dark:text-slate-800 stroke-current"
              strokeWidth="4"
              cx="50"
              cy="50"
              r="46"
              fill="transparent"
            />
            {/* Progress Track */}
            <circle
              className="text-[#F97316] stroke-current transition-all duration-1000 ease-linear"
              strokeWidth="4"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="46"
              fill="transparent"
              strokeDasharray="289.02" // 2 * pi * 46
              strokeDashoffset={289.02 - (289.02 * progressPercentage) / 100}
            />
          </svg>
          
          {/* Pulsing effect when active */}
          {isActive && (
            <div className="absolute inset-4 rounded-full bg-[#F97316] opacity-5 animate-ping" />
          )}

          <div className="flex flex-col items-center z-10">
            <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-[#F0F2F8] tabular-nums">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[10px] font-bold mt-2 uppercase tracking-[0.2em] text-[#F97316] opacity-90">
              {isActive ? "Studying" : timeElapsed > 0 ? "Paused" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Target Time Slider */}
      {!isActive && timeElapsed === 0 && (
        <div className="px-8 pb-2 z-10 w-full flex flex-col items-center">
          <label className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mb-3">
            Set Focus Time: {targetTimeMinutes} mins
          </label>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="5" 
            value={targetTimeMinutes}
            onChange={(e) => setTargetTimeMinutes(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-[#1E2132] rounded-lg appearance-none cursor-pointer accent-[#F97316]"
          />
          <div className="flex justify-between w-full mt-2 text-xs text-slate-400 dark:text-[#8B92A5] font-semibold px-1">
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
            <span>30</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-6 pt-4 pb-8 flex flex-col items-center gap-4 z-10">
        <div className="flex justify-center gap-4">
          <button
            onClick={toggleTimer}
            disabled={isLogging}
            className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
              isActive 
                ? "bg-orange-500/10 text-[#F97316]" 
                : "bg-[#F97316] text-white hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/20"
            }`}
          >
            {isLogging ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : isActive ? (
              <Pause className="h-7 w-7" fill="currentColor" />
            ) : (
              <Play className="h-7 w-7 ml-1" fill="currentColor" />
            )}
          </button>
          
          <button
            onClick={resetTimer}
            disabled={isLogging}
            className="h-16 w-16 rounded-full bg-slate-50 dark:bg-[#181B26] border border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-[#8B92A5] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#1E2132] hover:text-slate-700 dark:hover:text-white transition-all duration-300 shadow-xs active:scale-95 cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>

        {/* Save button appears when paused with elapsed time */}
        {timeElapsed > 0 && !isActive && (
          <button
            onClick={finishSession}
            disabled={isLogging}
            className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-xs transition-all bg-[#F97316] hover:bg-orange-600 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Session
          </button>
        )}
      </div>
    </div>
  );
}
