"use client";

import { GraduationCap } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface GradesEmptyStateProps {
  tab: "dashboard" | "analytics" | "progress";
  theme: InstituteTheme;
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

export default function GradesEmptyState({ tab, theme }: GradesEmptyStateProps) {
  const { heading, message } = TAB_COPY[tab];

  return (
    <div
      id={`grades-empty-state-${tab}`}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div
        className="flex items-center justify-center w-20 h-20 rounded-full mb-6"
        style={{ backgroundColor: `${theme.colors.primary}1A` }}
      >
        <GraduationCap
          className="w-10 h-10"
          style={{ color: theme.colors.primary }}
        />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{heading}</h2>
      <p className="text-sm text-gray-400 max-w-sm">{message}</p>
    </div>
  );
}
