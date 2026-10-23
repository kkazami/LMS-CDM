"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  initialCourseId?: string;
  initialTab?: Tab;
}

export default function GradesClient({
  gradeRows,
  enrolledCourses,
  theme,
  instituteCode: _instituteCode,
  initialCourseId = "all",
  initialTab = "dashboard",
}: GradesClientProps) {
  const isIte = (_instituteCode || theme.code || "").toLowerCase() === "ite";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlCourse = searchParams.get("course");
  const urlTab = searchParams.get("tab") as Tab | null;

  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab && ["dashboard", "analytics", "progress"].includes(urlTab)
      ? urlTab
      : initialTab
  );

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    urlCourse || initialCourseId || "all"
  );

  // Keep state in sync with URL back/forward navigation
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam) {
      setSelectedCourseId(courseParam);
    } else {
      setSelectedCourseId("all");
    }

    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam && ["dashboard", "analytics", "progress"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const params = new URLSearchParams(searchParams.toString());
    if (courseId === "all") {
      params.delete("course");
    } else {
      params.set("course", courseId);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const {
    isEnrolled,
    hasGradedWork,
    isAllSubjects,
    isUnknownCourse,
    selectedCourse,
    filteredRows,
    gwa,
    gwaRemark,
    isGwaPassing,
    overallPercent,
    perCourseStats,
    trendData,
  } = useGrades(gradeRows, enrolledCourses, selectedCourseId);

  // Charts need ≥1 course stat and ≥1 trend point (or ≥2 data points for full trends)
  const hasEnoughDataForCharts = perCourseStats.length >= 1 && filteredRows.length >= 1;

  return (
    <div className="max-w-6xl mx-auto page-enter space-y-7">
      {/* ── Page Header & Shared Subject Filter (Task 3) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Grades</h1>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
            View and track your academic performance across all your classes
          </p>
        </div>

        {/* ── Subject Filter Selector (shared across all three tabs) ── */}
        {isEnrolled && (
          <div className="flex items-center gap-2.5 shrink-0">
            <label
              htmlFor="grades-subject-select"
              className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8B92A5] shrink-0"
            >
              Subject:
            </label>
            <select
              id="grades-subject-select"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className={`min-w-[200px] max-w-xs sm:max-w-sm px-4 py-2.5 text-sm font-semibold bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-[#F0F2F8] rounded-xl cursor-pointer transition-all focus:outline-none focus:ring-2 ${
                isIte
                  ? "focus:ring-blue-500/20 focus:border-blue-600"
                  : "focus:ring-orange-500/20 focus:border-orange-500"
              } shadow-xs`}
            >
              <option value="all">All subjects</option>
              {enrolledCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Tab Bar (Institute theme dynamic active color) ── */}
      <div className="flex items-end gap-1 border-b border-slate-200/80 dark:border-white/5 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`grades-tab-${tab.key}`}
              onClick={() => handleTabChange(tab.key)}
              style={
                isActive
                  ? { borderColor: theme.colors.primary, color: theme.colors.primary }
                  : undefined
              }
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? ""
                  : "border-transparent text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
              }`}
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
          <GradesEmptyState tab="dashboard" theme={theme} />
        ) : isUnknownCourse ? (
          <GradesNoGradedWork
            tab="dashboard"
            theme={theme}
            heading="Subject Not Found"
            message="The requested subject is not in your enrolled courses."
          />
        ) : !hasGradedWork ? (
          <GradesNoGradedWork
            tab="dashboard"
            theme={theme}
            heading={selectedCourse ? `No Graded Work for ${selectedCourse.code}` : undefined}
            message={
              selectedCourse
                ? `There are no graded submissions recorded for ${selectedCourse.title} yet.`
                : undefined
            }
          />
        ) : (
          <GradesDashboard
            allRows={filteredRows}
            enrolledCourses={enrolledCourses}
            theme={theme}
            selectedCourseId={selectedCourseId}
            onCourseChange={handleCourseChange}
          />
        )
      )}

      {activeTab === "analytics" && (
        !isEnrolled ? (
          <GradesEmptyState tab="analytics" theme={theme} />
        ) : isUnknownCourse ? (
          <GradesNoGradedWork
            tab="analytics"
            theme={theme}
            heading="Subject Not Found"
            message="The requested subject is not in your enrolled courses."
          />
        ) : !hasEnoughDataForCharts ? (
          <GradesNoGradedWork
            tab="analytics"
            theme={theme}
            heading={
              selectedCourse
                ? `No Chart Data for ${selectedCourse.code}`
                : "Not Enough Data For Charts"
            }
            message={
              selectedCourse
                ? `Charts will appear once you have graded submissions recorded in ${selectedCourse.title}.`
                : "Charts will appear once you have at least 1 graded submission across your enrolled classes."
            }
          />
        ) : (
          <GradesAnalytics
            perCourseStats={perCourseStats}
            trendData={trendData}
            theme={theme}
            isAllSubjects={isAllSubjects}
          />
        )
      )}

      {activeTab === "progress" && (
        !isEnrolled ? (
          <GradesEmptyState tab="progress" theme={theme} />
        ) : isUnknownCourse ? (
          <GradesNoGradedWork
            tab="progress"
            theme={theme}
            heading="Subject Not Found"
            message="The requested subject is not in your enrolled courses."
          />
        ) : !hasGradedWork ? (
          <GradesNoGradedWork
            tab="progress"
            theme={theme}
            heading={
              selectedCourse
                ? `No Progress Data for ${selectedCourse.code}`
                : "No Progress Data Yet"
            }
            message={
              selectedCourse
                ? `Academic progress and grade point will appear once work is evaluated in ${selectedCourse.title}.`
                : "Your GWA and progress tracking will appear once your instructor grades your submitted work."
            }
          />
        ) : (
          <GradesProgress
            gwa={gwa}
            gwaRemark={gwaRemark}
            isGwaPassing={isGwaPassing}
            overallPercent={overallPercent}
            perCourseStats={perCourseStats}
            allRows={filteredRows}
            theme={theme}
            isAllSubjects={isAllSubjects}
            onSelectCourse={handleCourseChange}
          />
        )
      )}
    </div>
  );
}
