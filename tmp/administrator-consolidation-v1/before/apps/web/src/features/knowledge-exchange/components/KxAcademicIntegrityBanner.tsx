"use client";

import React from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";

interface KxAcademicIntegrityBannerProps {
  syllabusItemTitle?: string;
  className?: string;
}

export default function KxAcademicIntegrityBanner({
  syllabusItemTitle,
  className = "",
}: KxAcademicIntegrityBannerProps) {
  return (
    <div
      className={`rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-900 dark:text-red-200 shadow-xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold flex items-center gap-2">
            Academic Integrity Guardrail: Linked to Assessment
            {syllabusItemTitle && (
              <span className="font-normal text-xs text-red-700 dark:text-red-300">
                ({syllabusItemTitle})
              </span>
            )}
          </h4>
          <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
            This discussion is linked to an active quiz or graded assessment.
            Sharing verbatim questions, solution keys, or seeking unfair
            advantage is strictly prohibited under institutional integrity
            policies. All posts and comments in this thread are monitored by
            course instructors.
          </p>
        </div>
      </div>
    </div>
  );
}
