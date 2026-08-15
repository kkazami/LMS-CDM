"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  GraduationCap,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { TaughtCourseOption } from "./page";
import { useAtRiskStudents, type AtRiskStudentItem } from "@/hooks/useAtRiskStudents";

interface AnalyticsClientProps {
  taughtCourses: TaughtCourseOption[];
  theme: InstituteTheme;
  instituteCode: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRiskBadge(level: "HIGH" | "MEDIUM" | "LOW") {
  switch (level) {
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          High Risk
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          <AlertCircle className="h-3.5 w-3.5" />
          Medium Risk
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle className="h-3.5 w-3.5" />
          Low Risk / On Track
        </span>
      );
  }
}

export default function AnalyticsClient({
  taughtCourses,
  theme,
  instituteCode: _instituteCode,
}: AnalyticsClientProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [activeTab, setActiveTab] = useState<"attention" | "all">("attention");
  const [filterLevel, setFilterLevel] = useState<"all" | "HIGH" | "MEDIUM">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const { students, isLoading, error, refetch } = useAtRiskStudents(selectedCourseId);

  // Statistics counters
  const totalAnalyzed = students.length;
  const highRiskCount = students.filter((s) => s.riskLevel === "HIGH").length;
  const mediumRiskCount = students.filter((s) => s.riskLevel === "MEDIUM").length;
  const lowRiskCount = students.filter((s) => s.riskLevel === "LOW").length;

  // Filter students based on active tab & search query & risk filter
  const displayedStudents = students.filter((s) => {
    // Tab filter: "attention" tab only shows HIGH and MEDIUM risk
    if (activeTab === "attention" && s.riskLevel === "LOW") {
      return false;
    }

    // Risk level pill filter
    if (filterLevel !== "all" && s.riskLevel !== filterLevel) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.studentName.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      const matchCode = s.courseCode.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchCode) return false;
    }

    return true;
  });

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  return (
    <div className="max-w-6xl mx-auto page-enter space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Analytics & Risk Identification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time automated risk tracking based on academic performance, submission status, and activity
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-gray-400" : "text-gray-500"}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ── Class Filter & Overview Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Class Scope:</span>
          <select
            id="analytics-course-filter"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 transition-shadow"
            style={{
              // @ts-expect-error CSS variable for focus ring
              "--tw-ring-color": `${theme.colors.primary}40`,
            }}
          >
            <option value="all">All My Classes ({taughtCourses.length})</option>
            {taughtCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Metric Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Students Analyzed</span>
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{totalAnalyzed}</p>
            <p className="mt-1 text-xs text-gray-500">Across selected class scope</p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700">High Risk Students</span>
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-red-700">{highRiskCount}</p>
            <p className="mt-1 text-xs text-red-600 font-medium">Requires immediate intervention</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Medium Risk Students</span>
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700">{mediumRiskCount}</p>
            <p className="mt-1 text-xs text-amber-600 font-medium">Needs monitoring / follow-up</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">On Track / Low Risk</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700">{lowRiskCount}</p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Performing as expected</p>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filter Controls ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
          {/* Main Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              id="analytics-tab-attention"
              onClick={() => setActiveTab("attention")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "attention"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Students Needing Attention ({highRiskCount + mediumRiskCount})</span>
            </button>

            <button
              id="analytics-tab-all"
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "all"
                  ? "bg-gray-100 text-gray-900 border border-gray-300"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>All Enrolled Students ({totalAnalyzed})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 w-full sm:w-64">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Risk Level Filter Pills (Attention tab only) */}
        {activeTab === "attention" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Filter by risk:</span>
            <button
              onClick={() => setFilterLevel("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterLevel === "all" ? "bg-gray-900 text-white font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Flagged ({highRiskCount + mediumRiskCount})
            </button>
            <button
              onClick={() => setFilterLevel("HIGH")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterLevel === "HIGH" ? "bg-red-600 text-white font-medium" : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              High Risk Only ({highRiskCount})
            </button>
            <button
              onClick={() => setFilterLevel("MEDIUM")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterLevel === "MEDIUM" ? "bg-amber-600 text-white font-medium" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Medium Risk Only ({mediumRiskCount})
            </button>
          </div>
        )}
      </div>

      {/* ── Student List View ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Calculating risk metrics from student activity data...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Try Again
          </button>
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 text-center p-6">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {activeTab === "attention" ? "No students need immediate attention!" : "No students found"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            {activeTab === "attention"
              ? "All enrolled students are performing well and meeting activity/grade expectations."
              : "Try adjusting your search query or class filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedStudents.map((student) => {
            const isExpanded = expandedStudentId === student.id;
            const summaryReason = student.reasons.join(" • ");

            return (
              <div
                key={student.id}
                id={`student-risk-card-${student.id}`}
                className="rounded-xl border bg-white transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
                style={{
                  borderColor:
                    student.riskLevel === "HIGH"
                      ? "#FCA5A5"
                      : student.riskLevel === "MEDIUM"
                      ? "#FDE68A"
                      : "#E5E7EB",
                  borderLeftWidth: "5px",
                  borderLeftColor:
                    student.riskLevel === "HIGH"
                      ? "#EF4444"
                      : student.riskLevel === "MEDIUM"
                      ? "#F59E0B"
                      : "#10B981",
                }}
              >
                {/* ── Summary Row ── */}
                <div
                  onClick={() => toggleExpand(student.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {student.avatarUrl ? (
                      <img
                        src={student.avatarUrl}
                        alt={student.studentName}
                        className="h-11 w-11 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {getInitials(student.studentName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {student.studentName}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          {student.courseCode}
                        </span>
                        {getRiskBadge(student.riskLevel)}
                      </div>

                      {/* One-line summary */}
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {summaryReason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-medium text-gray-500 hidden md:inline">
                      {isExpanded ? "Hide Details" : "Click for Details"}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Student Detail View (Expanded Panel) ── */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50 p-6 space-y-6 animate-in">
                    {/* 1. Flagged Reasons Breakdown */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <FileWarning className="h-4 w-4 text-amber-500" />
                        Identified Risk Indicators & Reasons
                      </h4>
                      <ul className="space-y-2">
                        {student.reasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 shadow-2xs"
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  student.riskLevel === "HIGH"
                                    ? "#EF4444"
                                    : student.riskLevel === "MEDIUM"
                                    ? "#F59E0B"
                                    : "#10B981",
                              }}
                            />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 2. Detailed Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Missed Assignments Detail */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-red-500" />
                            Missed / Past Due Work ({student.details.missedAssignments.length})
                          </h5>
                        </div>
                        {student.details.missedAssignments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No past-due missed assignments.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {student.details.missedAssignments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs p-2 rounded bg-red-50/50 border border-red-100"
                              >
                                <span className="font-medium text-gray-800 truncate">{item.title}</span>
                                <span className="text-[10px] text-red-600 font-semibold shrink-0 ml-2">
                                  Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "Past Due"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Grade Performance Detail */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                            Academic Average & Submissions
                          </h5>
                          <span className="text-xs font-bold text-gray-900">
                            {student.details.gradeAverage !== null
                              ? `${Math.round(student.details.gradeAverage)}% Avg`
                              : "No graded work"}
                          </span>
                        </div>
                        {student.details.gradedSubmissions.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No graded submissions yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {student.details.gradedSubmissions.map((sub) => {
                              const pct = (sub.score / sub.maxPoints) * 100;
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between text-xs p-2 rounded bg-gray-50 border border-gray-100"
                                >
                                  <span className="text-gray-800 truncate">{sub.title}</span>
                                  <span
                                    className={`font-semibold shrink-0 ml-2 ${
                                      pct < 65
                                        ? "text-red-600"
                                        : pct < 75
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {sub.score} / {sub.maxPoints} pts ({Math.round(pct)}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Inactivity & Module Completion Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Inactivity status */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                        <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          Activity Recency
                        </h5>
                        <p className="text-xs text-gray-600">
                          {student.details.daysInactive !== null ? (
                            <>
                              Last active: <span className="font-semibold text-gray-800">{student.details.daysInactive} days ago</span> (
                              {student.details.lastActiveDate
                                ? new Date(student.details.lastActiveDate).toLocaleDateString()
                                : "N/A"}
                              )
                            </>
                          ) : (
                            <span className="text-gray-400 italic">No activity recorded yet in this course</span>
                          )}
                        </p>
                      </div>

                      {/* Incomplete modules */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1.5">
                        <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                          Incomplete Learning Materials ({student.details.incompleteModules.length})
                        </h5>
                        {student.details.incompleteModules.length === 0 ? (
                          <p className="text-xs text-emerald-600 font-medium">All course materials completed!</p>
                        ) : (
                          <div className="space-y-1">
                            {student.details.incompleteModules.slice(0, 3).map((mod) => (
                              <p key={mod.id} className="text-xs text-gray-600 truncate">
                                • {mod.title}
                              </p>
                            ))}
                            {student.details.incompleteModules.length > 3 && (
                              <p className="text-[10px] text-gray-400">
                                + {student.details.incompleteModules.length - 3} more incomplete items
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
