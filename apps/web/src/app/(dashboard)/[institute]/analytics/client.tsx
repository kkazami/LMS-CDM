"use client";

import { useState, useRef, useEffect } from "react";
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
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { TaughtCourseOption } from "./page";
import { useAtRiskStudents, type AtRiskStudentItem } from "@/hooks/useAtRiskStudents";
import { exportAnalyticsToCsv, exportAnalyticsToPdf, type ExportContextInfo } from "@/lib/analytics-export";
import SupplementaryImportModal from "@/components/analytics/SupplementaryImportModal";

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertTriangle className="h-3.5 w-3.5" />
          High Risk
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          <AlertCircle className="h-3.5 w-3.5" />
          Medium Risk
        </span>
      );
    case "LOW":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
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

  // Export & Import state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // Close export dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsExportMenuOpen(false);
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isExportMenuOpen]);

  const getExportContext = (): ExportContextInfo => {
    const selectedCourse = taughtCourses.find((c) => c.id === selectedCourseId);
    const scopeName = selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : "All My Classes";
    const tabLabel = activeTab === "attention" ? "Students Needing Attention" : "All Enrolled Students";
    const riskFilterLabel =
      activeTab === "attention"
        ? filterLevel === "HIGH"
          ? "High Risk Only"
          : filterLevel === "MEDIUM"
          ? "Medium Risk Only"
          : "All Flagged"
        : "All Students";

    return {
      scopeName,
      tabLabel,
      riskFilterLabel,
      highCount: highRiskCount,
      mediumCount: mediumRiskCount,
      lowCount: lowRiskCount,
    };
  };

  const handleExportCsv = () => {
    if (displayedStudents.length === 0) return;
    try {
      setIsExporting("csv");
      exportAnalyticsToCsv(displayedStudents, getExportContext());
    } finally {
      setIsExporting(null);
      setIsExportMenuOpen(false);
    }
  };

  const handleExportPdf = async () => {
    if (displayedStudents.length === 0) return;
    try {
      setIsExporting("pdf");
      await exportAnalyticsToPdf(displayedStudents, getExportContext());
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(null);
      setIsExportMenuOpen(false);
    }
  };

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  return (
    <div className="max-w-6xl mx-auto page-enter space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Student Analytics & Risk Identification</h1>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
            Real-time automated risk tracking based on academic performance, submission status, and activity
          </p>
        </div>

        {/* Action Buttons: Import, Export & Refresh */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {/* Import Supplementary Data Button */}
          <button
            id="analytics-import-btn"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
            title="Import supplementary assessment scores via CSV"
          >
            <Upload className="h-4 w-4 text-slate-500 dark:text-[#8B92A5]" />
            <span>Import</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              id="analytics-export-dropdown-trigger"
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              disabled={isLoading || displayedStudents.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              aria-haspopup="true"
              aria-expanded={isExportMenuOpen}
              title={displayedStudents.length === 0 ? "No student data to export" : "Export current view"}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <Download className="h-4 w-4 text-slate-500 dark:text-[#8B92A5]" />
              )}
              <span>Export</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${isExportMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-lg z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-white/5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-[#F0F2F8]">Export Current View</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#8B92A5] truncate mt-0.5">
                    {displayedStudents.length} student{displayedStudents.length === 1 ? "" : "s"} included
                  </p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    id="analytics-export-csv-btn"
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting !== null}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Export as CSV (.csv)</p>
                      <p className="text-[10px] text-slate-500 dark:text-[#8B92A5]">Spreadsheet with all risk indicators</p>
                    </div>
                  </button>

                  <button
                    id="analytics-export-pdf-btn"
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExporting !== null}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Export as PDF (.pdf)</p>
                      <p className="text-[10px] text-slate-500 dark:text-[#8B92A5]">Printable summary report table</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-slate-400" : "text-slate-500 dark:text-[#8B92A5]"}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ── Class Filter & Overview Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-500 dark:text-[#8B92A5]" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Class Scope:</span>
          <select
            id="analytics-course-filter"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 transition-shadow"
            style={{
              // @ts-expect-error CSS variable for focus ring
              "--tw-ring-color": `${theme.colors.primary}40`,
            }}
          >
            <option value="all" className="dark:bg-[#1A1D27] dark:text-[#F0F2F8]">All My Classes ({taughtCourses.length})</option>
            {taughtCourses.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-[#1A1D27] dark:text-[#F0F2F8]">
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Metric Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">Students Analyzed</span>
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-[#F0F2F8]">{totalAnalyzed}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B92A5]">Across selected class scope</p>
          </div>

          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">High Risk Students</span>
              <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-red-700 dark:text-red-400">{highRiskCount}</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">Requires immediate intervention</p>
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Medium Risk Students</span>
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700 dark:text-amber-400">{mediumRiskCount}</p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">Needs monitoring / follow-up</p>
          </div>

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">On Track / Low Risk</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700 dark:text-emerald-400">{lowRiskCount}</p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Performing as expected</p>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filter Controls ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-3">
          {/* Main Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              id="analytics-tab-attention"
              onClick={() => setActiveTab("attention")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === "attention"
                  ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                  : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Students Needing Attention ({highRiskCount + mediumRiskCount})</span>
            </button>

            <button
              id="analytics-tab-all"
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-[#F0F2F8] border border-slate-300 dark:border-white/15"
                  : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>All Enrolled Students ({totalAnalyzed})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] px-3 py-1.5 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 dark:text-[#8B92A5] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name..."
              className="w-full bg-transparent text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Risk Level Filter Pills (Attention tab only) */}
        {activeTab === "attention" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-[#8B92A5] font-medium">Filter by risk:</span>
            <button
              onClick={() => setFilterLevel("all")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterLevel === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5] hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              All Flagged ({highRiskCount + mediumRiskCount})
            </button>
            <button
              onClick={() => setFilterLevel("HIGH")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterLevel === "HIGH"
                  ? "bg-red-600 text-white font-medium"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
              }`}
            >
              High Risk Only ({highRiskCount})
            </button>
            <button
              onClick={() => setFilterLevel("MEDIUM")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterLevel === "MEDIUM"
                  ? "bg-amber-600 text-white font-medium"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              }`}
            >
              Medium Risk Only ({mediumRiskCount})
            </button>
          </div>
        )}
      </div>

      {/* ── Student List View ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#141721] rounded-xl border border-slate-200 dark:border-white/10">
          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-[#8B92A5]">Calculating risk metrics from student activity data...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium text-white shadow-sm cursor-pointer"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Try Again
          </button>
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#141721] rounded-xl border border-slate-200 dark:border-white/10 text-center p-6">
          <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-[#F0F2F8]">
            {activeTab === "attention" ? "No students need immediate attention!" : "No students found"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mt-1">
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
                className="rounded-xl border bg-white dark:bg-[#141721] border-slate-200 dark:border-white/10 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
                style={{
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
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Avatar */}
                    {student.avatarUrl ? (
                      <img
                        src={student.avatarUrl}
                        alt={student.studentName}
                        className="h-11 w-11 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
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
                        <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8] truncate">
                          {student.studentName}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {student.courseCode}
                        </span>
                        {getRiskBadge(student.riskLevel)}
                      </div>

                      {/* One-line summary */}
                      <p className="text-xs text-slate-600 dark:text-[#8B92A5] mt-1 truncate">
                        {summaryReason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-[#8B92A5] hidden md:inline">
                      {isExpanded ? "Hide Details" : "Click for Details"}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Student Detail View (Expanded Panel) ── */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] p-6 space-y-6 animate-in">
                    {/* 1. Flagged Reasons Breakdown */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] mb-3 flex items-center gap-1.5">
                        <FileWarning className="h-4 w-4 text-amber-500" />
                        Identified Risk Indicators & Reasons
                      </h4>
                      <ul className="space-y-2">
                        {student.reasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm text-slate-700 dark:text-[#D1D5DB] bg-white dark:bg-[#141721] p-3 rounded-lg border border-slate-200 dark:border-white/10 shadow-2xs"
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
                      <div className="bg-white dark:bg-[#141721] p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-red-500" />
                            Missed / Past Due Work ({student.details.missedAssignments.length})
                          </h5>
                        </div>
                        {student.details.missedAssignments.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-[#8B92A5] italic">No past-due missed assignments.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {student.details.missedAssignments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs p-2 rounded bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30"
                              >
                                <span className="font-medium text-slate-800 dark:text-[#F0F2F8] truncate">{item.title}</span>
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold shrink-0 ml-2">
                                  Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "Past Due"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Grade Performance Detail */}
                      <div className="bg-white dark:bg-[#141721] p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                            Academic Average & Submissions
                          </h5>
                          <span className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8]">
                            {student.details.gradeAverage !== null
                              ? `${Math.round(student.details.gradeAverage)}% Avg`
                              : "No graded work"}
                          </span>
                        </div>
                        {student.details.gradedSubmissions.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-[#8B92A5] italic">No graded submissions yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {student.details.gradedSubmissions.map((sub) => {
                              const pct = (sub.score / sub.maxPoints) * 100;
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                                >
                                  <span className="text-slate-800 dark:text-[#F0F2F8] truncate">{sub.title}</span>
                                  <span
                                    className={`font-semibold shrink-0 ml-2 ${
                                      pct < 65
                                        ? "text-red-600 dark:text-red-400"
                                        : pct < 75
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-emerald-600 dark:text-emerald-400"
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
                      <div className="bg-white dark:bg-[#141721] p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5">
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          Activity Recency
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-[#8B92A5]">
                          {student.details.daysInactive !== null ? (
                            <>
                              Last active: <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">{student.details.daysInactive} days ago</span> (
                              {student.details.lastActiveDate
                                ? new Date(student.details.lastActiveDate).toLocaleDateString()
                                : "N/A"}
                              )
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8B92A5] italic">No activity recorded yet in this course</span>
                          )}
                        </p>
                      </div>

                      {/* Incomplete modules */}
                      <div className="bg-white dark:bg-[#141721] p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5">
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                          Incomplete Learning Materials ({student.details.incompleteModules.length})
                        </h5>
                        {student.details.incompleteModules.length === 0 ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All course materials completed!</p>
                        ) : (
                          <div className="space-y-1">
                            {student.details.incompleteModules.slice(0, 3).map((mod) => (
                              <p key={mod.id} className="text-xs text-slate-600 dark:text-[#8B92A5] truncate">
                                • {mod.title}
                              </p>
                            ))}
                            {student.details.incompleteModules.length > 3 && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
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

      {/* Supplementary Assessment CSV Import Modal */}
      <SupplementaryImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        taughtCourses={taughtCourses}
        initialCourseId={selectedCourseId}
        theme={theme}
        onImportSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
