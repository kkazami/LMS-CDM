"use client";

import type { InstituteTheme } from "@/lib/theme";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  theme?: InstituteTheme;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  theme,
}: ProgressBarProps) {
  if (totalSteps <= 1) return null;

  const percent = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-[#8B92A5]">
        <span>
          Page {currentStep} of {totalSteps}
        </span>
        <span>{percent}% Completed</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: primaryColor }}
        />
      </div>
    </div>
  );
}
