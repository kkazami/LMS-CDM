"use client";

import { useActivityStore } from "../stores/activity-store";
import { useActivitySubmission } from "../hooks/useActivitySubmission";
import { Timer, Trophy, RotateCcw, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface SubmitBarProps {
  /** The specific type of activity being submitted */
  activityType: "pc-build" | "arduino" | "server-rack" | "logic-gate" | "codelab";
  /** The assignment ID being attempted */
  assignmentId: string;
  /** The authenticated student's ID */
  studentId: string;
  /** The variant seed used to initialize the problem */
  variantSeed: string;
  /** When the activity was started (ISO string) */
  startedAt: string;
  /** Max possible score for this activity */
  maxScore?: number;
  /** Whether this activity is graded manually by the instructor */
  manualGrading?: boolean;
  /** Called after a successful submission */
  onSuccess?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * SubmitBar — A shared floating UI bar that displays activity progress (timer, attempts, score)
 * and handles submitting the activity result to the LMS backend.
 */
export default function SubmitBar({
  activityType,
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
  maxScore = 100,
  manualGrading = false,
  onSuccess,
}: SubmitBarProps) {
  const { elapsedSeconds, attempts, score, stateCheck, stopTimer } = useActivityStore();
  const { submit, isSubmitting, error, result } = useActivitySubmission();

  const handleSubmit = async () => {
    stopTimer();
    
    // Increment local attempts just before submitting
    useActivityStore.getState().incrementAttempts();
    const currentAttempts = useActivityStore.getState().attempts;

    const res = await submit({
      studentId,
      assignmentId,
      activityType,
      variantSeed,
      startedAt,
      completionTimeSeconds: elapsedSeconds,
      attempts: currentAttempts,
      stateCheck,
      score,
      maxScore,
      passed: score >= (maxScore * 0.7), // Arbitrary passing threshold (70%)
    });

    if (res && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 min-w-[320px] max-w-lg z-10 text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom-2 duration-200">
      
      {/* Top row: Stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-semibold" title="Time Elapsed">
          <Timer className="w-4 h-4 text-slate-400" />
          <span className="font-mono">{formatTime(elapsedSeconds)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-semibold" title="Attempts">
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>{attempts} att</span>
        </div>

        {!manualGrading && (
          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-bold" title="Current Score">
            <Trophy className="w-4 h-4 text-orange-500" />
            <span>{score} / {maxScore}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {manualGrading 
              ? "Submitted successfully! Awaiting instructor grading." 
              : `Submitted successfully! Score: ${result.score}%`}
          </p>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !!result}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-800/40 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting...</span>
          </>
        ) : result ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>{manualGrading ? "Submit for Grading" : "Submit Activity"}</span>
          </>
        )}
      </button>
    </div>
  );
}
