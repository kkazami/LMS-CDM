"use client";

import { GraduationCap } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradesEmptyStateProps {
  tab: "dashboard" | "analytics" | "progress";
  theme?: InstituteTheme;
}

const TAB_COPY: Record<
  GradesEmptyStateProps["tab"],
  { heading: string; message: string }
> = {
  dashboard: {
    heading: "Student Grades Dashboard",
    message:
      "You are not yet enrolled in any class. Join a class using a class code to see your grades here.",
  },
  analytics: {
    heading: "Visual Grade Analytics",
    message:
      "No chart data available. Enroll in a class to see your grade analytics here.",
  },
  progress: {
    heading: "Academic Progress Tracking",
    message:
      "No progress data available. Enroll in a class to track your academic progress here.",
  },
};

export default function GradesEmptyState({ tab }: GradesEmptyStateProps) {
  const { heading, message } = TAB_COPY[tab];

  return (
    <div
      id={`grades-empty-state-${tab}`}
      className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl p-8 shadow-xs"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-500/10 text-[#F97316]">
        <GraduationCap className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">{heading}</h2>
      <p className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-sm">{message}</p>
    </div>
  );
}
