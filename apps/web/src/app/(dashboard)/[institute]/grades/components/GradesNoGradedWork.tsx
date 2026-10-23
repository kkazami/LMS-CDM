"use client";

import { ClipboardList } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradesNoGradedWorkProps {
  theme?: InstituteTheme;
  tab?: "dashboard" | "analytics" | "progress";
  heading?: string;
  message?: string;
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
      "Your GWA and progress tracking will appear once your instructor grades your submitted work.",
  },
};

export default function GradesNoGradedWork({
  tab = "dashboard",
  heading,
  message,
  theme,
}: GradesNoGradedWorkProps) {
  const defaultCopy = TAB_COPY[tab] || TAB_COPY.dashboard;
  const displayHeading = heading || defaultCopy.heading;
  const displayMessage = message || defaultCopy.message;
  const isIte = (theme?.code || "").toLowerCase() === "ite";

  return (
    <div
      id={`grades-no-graded-work-${tab}`}
      className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 rounded-3xl p-8 shadow-xs transition-colors"
    >
      <div className={`flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
        isIte ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-orange-500/10 text-[#F97316]"
      }`}>
        <ClipboardList className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">{displayHeading}</h2>
      <p className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-sm">{displayMessage}</p>
    </div>
  );
}
