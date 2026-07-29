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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex flex-col gap-3 min-w-[320px] max-w-lg z-10">
      
      {/* Top row: Stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-gray-600" title="Time Elapsed">
          <Timer className="w-4 h-4" />
          <span className="font-mono font-medium">{formatTime(elapsedSeconds)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600" title="Attempts">
          <RotateCcw className="w-4 h-4" />
          <span className="font-medium">{attempts}</span>
        </div>

        {!manualGrading && (
          <div className="flex items-center gap-2 text-indigo-600" title="Current Score">
            <Trophy className="w-4 h-4" />
            <span className="font-bold">{score} / {maxScore}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {manualGrading 
              ? "Submitted successfully! Awaiting instructor grading." 
              : `Submitted successfully! Score: ${result.score}`}
          </p>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !!result}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : result ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Completed
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            {manualGrading ? "Submit for Grading" : "Submit Activity"}
          </>
        )}
      </button>
    </div>
  );
}
