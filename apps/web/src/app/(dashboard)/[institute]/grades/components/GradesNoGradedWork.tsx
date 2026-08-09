"use client";

import { ClipboardList } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradesNoGradedWorkProps {
  theme: InstituteTheme;
  /** Which tab is showing this state — affects copy for analytics/progress */
  tab?: "dashboard" | "analytics" | "progress";
}

const TAB_COPY: Record<string, { heading: string; message: string }> = {
  dashboard: {
    heading: "No graded work yet",
    message:
      "Your grades will appear here once your instructor grades your submitted assignments and quizzes.",
  },
  analytics: {
    heading: "Not enough data for charts",
    message:
      "Charts will appear once you have at least 2 graded submissions across your enrolled classes.",
  },
  progress: {
    heading: "No progress data yet",
    message:
      "Your GPA and progress tracking will appear once your instructor grades your submitted work.",
  },
};

export default function GradesNoGradedWork({
  theme,
  tab = "dashboard",
}: GradesNoGradedWorkProps) {
  const { heading, message } = TAB_COPY[tab];

  return (
    <div
      id={`grades-no-graded-work-${tab}`}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div
        className="flex items-center justify-center w-20 h-20 rounded-full mb-6"
        style={{ backgroundColor: "#F3F4F6" }}
      >
        <ClipboardList className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{heading}</h2>
      <p className="text-sm text-gray-400 max-w-sm">{message}</p>
    </div>
  );
}
