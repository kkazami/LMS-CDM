"use client";

import { ClipboardList } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradesNoGradedWorkProps {
  theme?: InstituteTheme;
  tab?: "dashboard" | "analytics" | "progress";
}

const TAB_COPY: Record<string, { heading: string; message: string }> = {
  dashboard: {
    heading: "No Graded Work Yet",
    message:
      "Your grades will appear here once your instructor grades your submitted assignments and quizzes.",
  },
  analytics: {
    heading: "Not Enough Data For Charts",
    message:
      "Charts will appear once you have at least 2 graded submissions across your enrolled classes.",
  },
  progress: {
    heading: "No Progress Data Yet",
    message:
      "Your GPA and progress tracking will appear once your instructor grades your submitted work.",
  },
};

export default function GradesNoGradedWork({
  tab = "dashboard",
}: GradesNoGradedWorkProps) {
  const { heading, message } = TAB_COPY[tab];

  return (
    <div
      id={`grades-no-graded-work-${tab}`}
      className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl p-8 shadow-xs"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-500/10 text-[#F97316]">
        <ClipboardList className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">{heading}</h2>
      <p className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-sm">{message}</p>
    </div>
  );
}
