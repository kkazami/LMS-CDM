"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Shield,
  ShieldAlert,
  ShieldOff,
  BarChart2,
  Edit3,
  RefreshCw,
  Pause,
  Play,
  Search,
  Radio,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import IntegrityReviewPanel from "@/components/courses/IntegrityReviewPanel";
import FormAnalytics from "@/components/forms/results/FormAnalytics";
import { withOpacity, type InstituteTheme } from "@/lib/theme";
import type {
  FormLiveMonitorSnapshot,
  FormLiveAttemptItem,
  FormLiveStudentItem,
} from "@/lib/forms/live-monitor";
import type { FormAnalyticsData } from "@/types/forms";

export type FormMonitorTab = "submissions" | "integrity" | "analytics";

interface FormLiveMonitorClientProps {
  initialSnapshot: FormLiveMonitorSnapshot;
  analytics: FormAnalyticsData;
  courseId: string;
  formId: string;
  instituteCode: string;
  theme: InstituteTheme;
  initialTab?: FormMonitorTab;
}

interface StudentCombinedRow {
  student: FormLiveStudentItem;
  primaryAttempt: FormLiveAttemptItem | null;
  allAttempts: FormLiveAttemptItem[];
  derivedStatus: "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT" | "GRADED" | "NOT_STARTED";
  flagCount: number;
}

const POLL_INTERVAL_MS = 4000;

function formatDurationSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export default function FormLiveMonitorClient({
  initialSnapshot,
  analytics,
  courseId,
  formId,
  instituteCode,
  theme,
  initialTab = "submissions",
}: FormLiveMonitorClientProps) {
  const [snapshot, setSnapshot] = useState<FormLiveMonitorSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = useState<FormMonitorTab>(initialTab);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date(initialSnapshot.serverNow));
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(
    () => new Date(initialSnapshot.serverNow).getTime() - Date.now()
  );
  const [nowMs, setNowMs] = useState<number>(() => new Date(initialSnapshot.serverNow).getTime());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "IN_PROGRESS" | "SUBMITTED" | "NOT_STARTED"
  >("ALL");
  const [expandedStudentHistory, setExpandedStudentHistory] = useState<Record<string, boolean>>({});

  const inFlightRef = useRef<boolean>(false);

  const primaryColor = theme.colors.primary;
  const activeTabTextColor = theme.code === "ibe" ? "#0F172A" : "#FFFFFF";

  const fetchLiveSnapshot = useCallback(
    async (manual = false) => {
      if (inFlightRef.current) return;
      if (!manual && typeof document !== "undefined" && document.hidden) return;

      inFlightRef.current = true;
      if (manual) setIsRefreshing(true);

      try {
        const res = await fetch(`/api/courses/${courseId}/forms/${formId}/live`, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as FormLiveMonitorSnapshot;
        if (data && data.form && Array.isArray(data.attempts)) {
          const serverTimeMs = new Date(data.serverNow).getTime();
          setSnapshot(data);
          setClockOffsetMs(serverTimeMs - Date.now());
          setNowMs(serverTimeMs);
          setLastUpdated(new Date());
        }
      } catch {
        // Keep current snapshot on transient network hiccup
      } finally {
        inFlightRef.current = false;
        if (manual) setIsRefreshing(false);
      }
    },
    [courseId, formId]
  );

  // Adaptive ~4s polling with visibility & focus handling
  useEffect(() => {
    if (!isLive) return;

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void fetchLiveSnapshot(false);
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        void fetchLiveSnapshot(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [isLive, fetchLiveSnapshot]);

  // 1-second local countdown / elapsed clock calibrated to serverNow
  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now() + clockOffsetMs);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [clockOffsetMs]);

  const handleTabChange = (nextTab: FormMonitorTab) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Per-student integrity event count
  const studentEventCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of snapshot.integrityEvents) {
      counts.set(ev.studentId, (counts.get(ev.studentId) || 0) + 1);
    }
    return counts;
  }, [snapshot.integrityEvents]);

  // Combine course roster with attempts
  const combinedRows = useMemo<StudentCombinedRow[]>(() => {
    const attemptsByUser = new Map<string, FormLiveAttemptItem[]>();
    for (const att of snapshot.attempts) {
      const list = attemptsByUser.get(att.userId) ?? [];
      list.push(att);
      attemptsByUser.set(att.userId, list);
    }

    const allStudentsList = [...snapshot.students].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return allStudentsList.map((student) => {
      const userAttempts = (attemptsByUser.get(student.id) ?? []).sort(
        (a, b) => b.attemptNumber - a.attemptNumber
      );

      // Prioritize an active IN_PROGRESS attempt; otherwise latest attempt
      const inProgressAttempt = userAttempts.find((a) => a.status === "IN_PROGRESS");
      const primaryAttempt = inProgressAttempt ?? userAttempts[0] ?? null;

      let derivedStatus: StudentCombinedRow["derivedStatus"] = "NOT_STARTED";
      if (primaryAttempt) {
        if (primaryAttempt.status === "IN_PROGRESS") {
          derivedStatus = "IN_PROGRESS";
        } else if (primaryAttempt.status === "TIMED_OUT") {
          derivedStatus = primaryAttempt.isGraded ? "GRADED" : "TIMED_OUT";
        } else {
          derivedStatus = primaryAttempt.isGraded ? "GRADED" : "SUBMITTED";
        }
      }

      const eventFlags = studentEventCountMap.get(student.id) || 0;
      const attemptCounters = userAttempts.reduce(
        (sum, a) => sum + (a.tabSwitchCount || 0) + (a.copyPasteCount || 0),
        0
      );
      const flagCount = Math.max(eventFlags, attemptCounters);

      return {
        student,
        primaryAttempt,
        allAttempts: userAttempts,
        derivedStatus,
        flagCount,
      };
    });
  }, [snapshot.students, snapshot.attempts, studentEventCountMap]);

  // Summary metrics
  const summaryStats = useMemo(() => {
    let inProgress = 0;
    let submitted = 0;
    let graded = 0;

    for (const row of combinedRows) {
      if (row.derivedStatus === "IN_PROGRESS") {
        inProgress++;
      } else if (
        row.derivedStatus === "SUBMITTED" ||
        row.derivedStatus === "TIMED_OUT" ||
        row.derivedStatus === "GRADED"
      ) {
        submitted++;
        if (row.primaryAttempt?.isGraded) {
          graded++;
        }
      }
    }

    return {
      assigned: combinedRows.length,
      inProgress,
      submitted,
      graded,
    };
  }, [combinedRows]);

  const filteredRows = useMemo(() => {
    return combinedRows
      .filter((row) => {
        if (statusFilter === "IN_PROGRESS" && row.derivedStatus !== "IN_PROGRESS") return false;
        if (
          statusFilter === "SUBMITTED" &&
          row.derivedStatus !== "SUBMITTED" &&
          row.derivedStatus !== "TIMED_OUT" &&
          row.derivedStatus !== "GRADED"
        ) {
          return false;
        }
        if (statusFilter === "NOT_STARTED" && row.derivedStatus !== "NOT_STARTED") return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = row.student.name.toLowerCase().includes(q);
          const emailMatch = row.student.email.toLowerCase().includes(q);
          const numMatch = (row.student.studentNumber || "").toLowerCase().includes(q);
          return nameMatch || emailMatch || numMatch;
        }
        return true;
      })
      .sort((a, b) => {
        // Show IN_PROGRESS first, then SUBMITTED/GRADED/TIMED_OUT, then NOT_STARTED
        const rank = (s: StudentCombinedRow["derivedStatus"]) =>
          s === "IN_PROGRESS" ? 0 : s === "NOT_STARTED" ? 2 : 1;
        const diff = rank(a.derivedStatus) - rank(b.derivedStatus);
        if (diff !== 0) return diff;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [combinedRows, statusFilter, searchQuery]);

  const renderAttemptTimingAndProgress = (attempt: FormLiveAttemptItem) => {
    const questionCount = snapshot.form.totalQuestions;
    const answered = Math.min(attempt.answeredCount, questionCount || attempt.answeredCount);
    const percentProgress =
      questionCount > 0 ? Math.min(100, Math.round((answered / questionCount) * 100)) : 0;

    if (attempt.status === "IN_PROGRESS") {
      const startedMs = new Date(attempt.startedAt).getTime();
      const elapsedSec = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
      const timeLimitMinutes = snapshot.form.timeLimitMins;

      let timingLabel = `${formatDurationSeconds(elapsedSec)} elapsed`;
      let timingUrgencyClass = "text-slate-600 dark:text-slate-300";

      const deadlineMs = attempt.deadlineAt
        ? new Date(attempt.deadlineAt).getTime()
        : timeLimitMinutes && timeLimitMinutes > 0
        ? startedMs + timeLimitMinutes * 60 * 1000
        : null;

      if (deadlineMs !== null) {
        const remainingSec = Math.floor((deadlineMs - nowMs) / 1000);
        if (remainingSec <= 0) {
          timingLabel = "Time expired (awaiting auto-submit)";
          timingUrgencyClass = "text-rose-600 dark:text-rose-400 font-bold";
        } else {
          timingLabel = `${formatDurationSeconds(remainingSec)} left`;
          if (remainingSec <= 60) {
            timingUrgencyClass = "text-rose-600 dark:text-rose-400 font-bold";
          } else if (remainingSec <= 300) {
            timingUrgencyClass = "text-amber-600 dark:text-amber-400 font-semibold";
          }
        }
      }

      return (
        <div className="space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {answered} / {questionCount} answered
            </span>
            <span className="text-[11px] text-slate-400">{percentProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percentProgress}%`, backgroundColor: primaryColor }}
            />
          </div>
          <div className={`flex items-center gap-1 text-[11px] ${timingUrgencyClass}`}>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{timingLabel}</span>
          </div>
        </div>
      );
    }

    // SUBMITTED or TIMED_OUT
    return (
      <div className="space-y-1">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {answered} / {questionCount} answered
        </div>
        <div className="text-[11px] text-slate-400 dark:text-[#8B92A5]">
          {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Submitted"}
          {attempt.timeSpentSecs
            ? ` • ${formatDurationSeconds(attempt.timeSpentSecs)}`
            : ""}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card (matches Add Task Submissions & Proctoring header) */}
      <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/${instituteCode}/courses/${courseId}/classwork`}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{snapshot.form.title}</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
              {activeTab === "integrity"
                ? "Integrity & Proctoring"
                : activeTab === "analytics"
                ? "Analytics"
                : "Submissions & Grading"}
            </span>
          </div>

          {/* Live Status & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {snapshot.form.monitoringEnabled ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: withOpacity(primaryColor, 0.1),
                  color: primaryColor,
                  borderColor: withOpacity(primaryColor, 0.25),
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                Monitoring Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <ShieldOff className="w-3.5 h-3.5" />
                Monitoring Off
              </span>
            )}

            {/* Pulsing LIVE badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isLive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
              }`}
              title={`Last synced at ${lastUpdated.toLocaleTimeString()}`}
            >
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLive ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
              </span>
              <span>{isLive ? "LIVE" : "PAUSED"}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsLive((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181B26] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title={isLive ? "Pause live polling" : "Resume live polling"}
            >
              {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLive ? "Pause" : "Resume"}</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchLiveSnapshot(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181B26] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh right now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-0 space-y-6">
        {/* 4 Shared Top Navigation Tabs: Questions / Builder | Submissions & Grading | Integrity & Proctoring | Analytics */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3 overflow-x-auto">
          <Link
            href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/builder`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>Questions / Builder</span>
          </Link>

          <button
            type="button"
            onClick={() => handleTabChange("submissions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === "submissions"
                ? "shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
            style={
              activeTab === "submissions"
                ? { backgroundColor: primaryColor, color: activeTabTextColor }
                : undefined
            }
          >
            <FileText className="w-4 h-4" />
            <span>Submissions & Grading</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "submissions"
                  ? "bg-black/15 text-current"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              }`}
            >
              {summaryStats.assigned}
            </span>
            {summaryStats.inProgress > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "submissions"
                    ? "bg-black/20 text-current"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                {summaryStats.inProgress} live
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("integrity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === "integrity"
                ? "shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
            style={
              activeTab === "integrity"
                ? { backgroundColor: primaryColor, color: activeTabTextColor }
                : undefined
            }
          >
            <Shield className="w-4 h-4" />
            <span>Integrity & Proctoring</span>
            {snapshot.integrityEvents.length > 0 ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "integrity"
                    ? "bg-black/20 text-current"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {snapshot.integrityEvents.length}
              </span>
            ) : snapshot.form.monitoringEnabled ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "integrity"
                    ? "bg-black/20 text-current"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                Clean
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "integrity"
                    ? "bg-black/20 text-current"
                    : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                }`}
              >
                Off
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === "analytics"
                ? "shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
            style={
              activeTab === "analytics"
                ? { backgroundColor: primaryColor, color: activeTabTextColor }
                : undefined
            }
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </div>

        {/* TAB 1: SUBMISSIONS & GRADING */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 p-5 text-center shadow-xs">
                <p className="text-3xl font-bold text-slate-800 dark:text-[#F0F2F8]">
                  {summaryStats.assigned}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mt-1">
                  Assigned
                </p>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-center shadow-xs">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {summaryStats.inProgress}
                  </p>
                  {summaryStats.inProgress > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider mt-1">
                  In Progress (Live)
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center shadow-xs">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summaryStats.submitted}
                </p>
                <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-wider mt-1">
                  Submitted
                </p>
              </div>

              <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-5 text-center shadow-xs">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {summaryStats.graded}
                </p>
                <p className="text-xs font-semibold text-purple-700/80 dark:text-purple-300/80 uppercase tracking-wider mt-1">
                  Graded
                </p>
              </div>
            </div>

            {/* Filter, Search, and CSV Export Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name, ID, or email..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs font-semibold self-start">
                  {(
                    [
                      { key: "ALL", label: "All" },
                      { key: "IN_PROGRESS", label: `In Progress (${summaryStats.inProgress})` },
                      { key: "SUBMITTED", label: `Submitted (${summaryStats.submitted})` },
                      {
                        key: "NOT_STARTED",
                        label: `Not Started (${
                          summaryStats.assigned - summaryStats.inProgress - summaryStats.submitted
                        })`,
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === item.key
                          ? "bg-white dark:bg-[#1E2132] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                          : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href={`/api/courses/${courseId}/forms/${formId}/responses/export`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs"
              >
                <Download className="h-4 w-4" style={{ color: primaryColor }} />
                <span>Export grades (CSV)</span>
              </a>
            </div>

            {/* Submissions & Live Progress Table */}
            <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#181B26]">
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                        Progress & Timing
                      </th>
                      <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                        Score / Grade
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-sm text-slate-400 dark:text-[#8B92A5]"
                        >
                          No matching students or submissions found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const att = row.primaryAttempt;
                        const canReview =
                          att && (att.status === "SUBMITTED" || att.status === "TIMED_OUT");
                        const hasMultipleAttempts = row.allAttempts.length > 1;
                        const isHistoryExpanded = Boolean(expandedStudentHistory[row.student.id]);

                        return (
                          <tr
                            key={row.student.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Student identity + flag pill */}
                            <td className="px-5 py-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
                                    {row.student.name}
                                  </p>
                                  {att && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                      Attempt #{att.attemptNumber}
                                    </span>
                                  )}
                                  {row.flagCount > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTabChange("integrity")}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                        row.flagCount >= 3
                                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                      }`}
                                      title="Click to inspect integrity & proctoring logs"
                                    >
                                      <ShieldAlert className="w-3 h-3" />
                                      <span>
                                        {row.flagCount} flag{row.flagCount === 1 ? "" : "s"}
                                      </span>
                                    </button>
                                  ) : (
                                    att &&
                                    snapshot.form.monitoringEnabled && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span>Clean</span>
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
                                  {row.student.studentNumber
                                    ? `${row.student.studentNumber} • `
                                    : ""}
                                  {row.student.email}
                                </p>

                                {hasMultipleAttempts && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedStudentHistory((prev) => ({
                                        ...prev,
                                        [row.student.id]: !prev[row.student.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mt-1 cursor-pointer"
                                  >
                                    {isHistoryExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                    <span>
                                      {row.allAttempts.length} total attempts
                                    </span>
                                  </button>
                                )}

                                {hasMultipleAttempts && isHistoryExpanded && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                    {row.allAttempts.map((histAtt) => {
                                      const histCanReview =
                                        histAtt.status === "SUBMITTED" ||
                                        histAtt.status === "TIMED_OUT";
                                      return (
                                        <div
                                          key={histAtt.id}
                                          className="flex items-center justify-between gap-3 text-[11px] bg-slate-50 dark:bg-white/[0.03] px-2.5 py-1.5 rounded-lg"
                                        >
                                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                            #{histAtt.attemptNumber} • {histAtt.status}
                                          </span>
                                          <span className="text-slate-500">
                                            {histCanReview
                                              ? `${histAtt.rawScore ?? 0}/${
                                                  histAtt.totalPoints ?? 0
                                                } (${histAtt.percentage ?? 0}%)`
                                              : `${histAtt.answeredCount}/${snapshot.form.totalQuestions} answered`}
                                          </span>
                                          {histCanReview && (
                                            <Link
                                              href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/responses/${histAtt.id}`}
                                              className="font-semibold hover:underline"
                                              style={{ color: primaryColor }}
                                            >
                                              Review
                                            </Link>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Status Pill */}
                            <td className="px-5 py-4 align-top">
                              {row.derivedStatus === "IN_PROGRESS" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                  </span>
                                  In Progress
                                </span>
                              )}
                              {row.derivedStatus === "SUBMITTED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Submitted
                                </span>
                              )}
                              {row.derivedStatus === "GRADED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Graded
                                </span>
                              )}
                              {row.derivedStatus === "TIMED_OUT" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                  <Clock className="h-3.5 w-3.5" />
                                  Timed Out
                                </span>
                              )}
                              {row.derivedStatus === "NOT_STARTED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[#8B92A5]">
                                  <FileText className="h-3.5 w-3.5" />
                                  Not Started
                                </span>
                              )}
                            </td>

                            {/* Progress & Timing */}
                            <td className="px-5 py-4 align-top">
                              {att ? (
                                renderAttemptTimingAndProgress(att)
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-600">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Score / Grade (Hidden while IN_PROGRESS per requirement #3) */}
                            <td className="px-5 py-4 align-top">
                              {!att || row.derivedStatus === "NOT_STARTED" ? (
                                <span className="text-xs text-slate-400 dark:text-slate-600">
                                  —
                                </span>
                              ) : att.status === "IN_PROGRESS" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-[#8B92A5] italic">
                                  Answering live…
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                      {att.rawScore ?? 0} / {att.totalPoints ?? 0}
                                    </span>
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                        (att.percentage ?? 0) >= 75
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                      }`}
                                    >
                                      {att.percentage ?? 0}%
                                    </span>
                                  </div>
                                  {!att.isGraded && (
                                    <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                      Needs manual review
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Action (Enabled ONLY when SUBMITTED or TIMED_OUT per requirement #3) */}
                            <td className="px-5 py-4 align-top text-right">
                              {canReview && att ? (
                                <Link
                                  href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/responses/${att.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                                  style={{
                                    backgroundColor: withOpacity(primaryColor, 0.12),
                                    color: primaryColor,
                                  }}
                                >
                                  <span>{att.isGraded ? "Review / Update" : "Grade"}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : att?.status === "IN_PROGRESS" ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 select-none"
                                  title="Grading is available after the student submits or times out"
                                >
                                  In progress
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 dark:text-slate-600">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTEGRITY & PROCTORING */}
        {activeTab === "integrity" && (
          <div className="space-y-6">
            {!snapshot.form.monitoringEnabled && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Integrity & Proctoring Monitoring is Off for this Form
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#8B92A5] max-w-2xl">
                      New live integrity events (tab switches, clipboard actions, window blurs, and
                      fullscreen exits) are only recorded when proctoring is enabled in{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Form Settings → Integrity & Proctoring
                      </span>
                      .
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/builder`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor, color: activeTabTextColor }}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Open Builder Settings</span>
                </Link>
              </div>
            )}

            {(snapshot.form.monitoringEnabled || snapshot.integrityEvents.length > 0) && (
              <IntegrityReviewPanel
                students={snapshot.students.map((s) => ({
                  id: s.id,
                  name: s.name,
                  email: s.email,
                }))}
                events={snapshot.integrityEvents}
                itemTitle={snapshot.form.title}
              />
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === "analytics" && <FormAnalytics analytics={analytics} theme={theme} />}
      </div>
    </div>
  );
}
