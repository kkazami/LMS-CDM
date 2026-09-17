"use client";

import { Shield, Maximize2, AlertTriangle, ArrowRight } from "lucide-react";

interface FullscreenEnforcementModalProps {
  isOpen: boolean;
  isInitialPrompt: boolean;
  onEnterFullscreen: () => void;
  onDismiss?: () => void;
  quizTitle: string;
}

export default function FullscreenEnforcementModal({
  isOpen,
  isInitialPrompt,
  onEnterFullscreen,
  quizTitle,
}: FullscreenEnforcementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151824] p-6 sm:p-7 shadow-2xl space-y-5 text-center">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-inner">
          {isInitialPrompt ? (
            <Maximize2 className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
            <Shield className="w-3.5 h-3.5" />
            Integrity Monitored Assessment
          </span>

          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-[#F0F2F8]">
            {isInitialPrompt
              ? "Fullscreen Mode Required"
              : "Fullscreen Exit Recorded"}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B92A5] leading-relaxed">
            {isInitialPrompt ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">{quizTitle}</span>{" "}
                requires fullscreen mode. All tab switches, window blurs, and fullscreen exits are logged transparently for your instructor's review.
              </>
            ) : (
              <>
                You have exited fullscreen mode. This exit event has been recorded in your attempt log for instructor review. Please return to fullscreen to continue your assessment.
              </>
            )}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onEnterFullscreen}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white py-3 px-5 text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>{isInitialPrompt ? "Enter Fullscreen & Begin" : "Return to Fullscreen"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">
          Non-punitive integrity monitoring • You are not blocked or auto-failed
        </p>
      </div>
    </div>
  );
}
