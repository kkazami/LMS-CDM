"use client";

import { useState } from "react";
import { BarChart2, LineChart, GraduationCap, type LucideIcon } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { GradeRow, EnrolledCourse } from "./types";
import { useGrades } from "./hooks/useGrades";
import GradesEmptyState from "./components/GradesEmptyState";
import GradesNoGradedWork from "./components/GradesNoGradedWork";
import GradesDashboard from "./components/GradesDashboard";
import GradesAnalytics from "./components/GradesAnalytics";
import GradesProgress from "./components/GradesProgress";

type Tab = "dashboard" | "analytics" | "progress";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Student Grades Dashboard", icon: GraduationCap },
  { key: "analytics", label: "Visual Grade Analytics", icon: BarChart2 },
  { key: "progress", label: "Academic Progress Tracking", icon: LineChart },
];

interface GradesClientProps {
  gradeRows: GradeRow[];
  enrolledCourses: EnrolledCourse[];
  theme: InstituteTheme;
  instituteCode: string;
}

export default function GradesClient({
  gradeRows,
  enrolledCourses,
  theme,
  instituteCode: _instituteCode,
}: GradesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  const {
    isEnrolled,
    hasGradedWork,
    filteredRows,
    allRows,
    gpa,
    letterGrade,
    perCourseStats,
    trendData,
  } = useGrades(gradeRows, enrolledCourses, selectedCourseId);

  // Charts need ≥2 data points to be meaningful
  const hasEnoughDataForCharts = perCourseStats.length >= 1 && allRows.length >= 2;

  return (
    <div className="max-w-5xl mx-auto page-enter">
      {/* ── Page Header ── */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and track your academic performance across all your classes
        </p>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-end gap-0 border-b border-gray-200 mb-8 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`grades-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none"
              style={{
                borderColor: isActive ? theme.colors.primary : "transparent",
                color: isActive ? theme.colors.primary : "#6B7280",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}

      {activeTab === "dashboard" && (
        !isEnrolled ? (
          // Not enrolled in any class at all
          <GradesEmptyState tab="dashboard" theme={theme} />
        ) : !hasGradedWork ? (
          // Enrolled but instructor hasn't graded anything yet
          <GradesNoGradedWork theme={theme} />
        ) : (
          <GradesDashboard
            allRows={allRows}
            enrolledCourses={enrolledCourses}
            theme={theme}
            selectedCourseId={selectedCourseId}
            onCourseChange={setSelectedCourseId}
          />
        )
      )}

      {activeTab === "analytics" && (
        !isEnrolled ? (
          <GradesEmptyState tab="analytics" theme={theme} />
        ) : !hasEnoughDataForCharts ? (
          // Enrolled but insufficient graded data for meaningful charts
          <GradesNoGradedWork tab="analytics" theme={theme} />
        ) : (
          <GradesAnalytics
            perCourseStats={perCourseStats}
            trendData={trendData}
            theme={theme}
          />
        )
      )}

      {activeTab === "progress" && (
        !isEnrolled ? (
          <GradesEmptyState tab="progress" theme={theme} />
        ) : !hasGradedWork ? (
          <GradesNoGradedWork tab="progress" theme={theme} />
        ) : (
          <GradesProgress
            gpa={gpa}
            letterGrade={letterGrade}
            perCourseStats={perCourseStats}
            allRows={allRows}
            theme={theme}
          />
        )
      )}
    </div>
  );
}
