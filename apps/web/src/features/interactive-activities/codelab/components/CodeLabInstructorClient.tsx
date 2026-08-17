"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CodeLabProblemSummary } from "../problems/types";
import {
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Flame,
  ArrowLeft,
  ShieldAlert,
  Code2,
  Ban,
  Trash2,
  RotateCcw,
  AlertOctagon,
  Loader2,
  ChevronRight,
  X,
  Clock,
  HelpCircle,
  Activity,
  Zap,
  Layers,
  Send,
  Check,
} from "lucide-react";

import CountUpNumber from "./analytics/CountUpNumber";
import AnimatedBar from "./analytics/AnimatedBar";
import AnimatedDonut from "./analytics/AnimatedDonut";
import MasteryHeatmap from "./analytics/MasteryHeatmap";
import FunnelChart from "./analytics/FunnelChart";
import CalendarHeatmap from "./analytics/CalendarHeatmap";
import { toast } from "@/components/common/Toast";

export interface InstructorSubmissionRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  templateId: string;
  problemTitle: string;
  language: string;
  score: number;
  attempts: number;
  passed: boolean;
  completionTimeSeconds: number;
  submittedAt: string;
  pasteCount: number;
  typingVelocityCpm: number;
  isFlagged: boolean;
  flagReasons: string[];
  isRejected?: boolean;
  rejectionReason?: string;
  // Forensic Analytics Telemetry
  hintUsed?: boolean;
  errorTypes?: string[];
  attemptChurnCount?: number;
  firstRunMs?: number;
  totalEditingMs?: number;
  level?: number;
}

interface CodeLabInstructorClientProps {
  institute: string;
  problems: CodeLabProblemSummary[];
  submissions: InstructorSubmissionRecord[];
}

const LANGUAGE_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  python: {
    label: "Python",
    bg: "bg-[#EFF6FF] dark:bg-[#1E3A5F]",
    text: "text-[#2563EB] dark:text-[#60A5FA]",
    border: "border-blue-200 dark:border-blue-500/20",
    dot: "bg-[#2563EB] dark:bg-[#60A5FA]",
  },
  cpp: {
    label: "C++",
    bg: "bg-[#FAF5FF] dark:bg-[#2D1F4E]",
    text: "text-[#7C3AED] dark:text-[#A78BFA]",
    border: "border-purple-200 dark:border-purple-500/20",
    dot: "bg-[#7C3AED] dark:bg-[#A78BFA]",
  },
  javascript: {
    label: "JavaScript",
    bg: "bg-[#FEFCE8] dark:bg-[#3A301A]",
    text: "text-[#D97706] dark:text-[#FCD34D]",
    border: "border-amber-200 dark:border-amber-500/20",
    dot: "bg-[#D97706] dark:bg-[#FCD34D]",
  },
  java: {
    label: "Java",
    bg: "bg-[#FFF7ED] dark:bg-[#3A241A]",
    text: "text-[#EA580C] dark:text-[#FB923C]",
    border: "border-orange-200 dark:border-orange-500/20",
    dot: "bg-[#EA580C] dark:bg-[#FB923C]",
  },
  csharp: {
    label: "C#",
    bg: "bg-[#F0FDF4] dark:bg-[#1A3A3A]",
    text: "text-[#059669] dark:text-[#34D399]",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-[#059669] dark:bg-[#34D399]",
  },
  sql: {
    label: "SQL",
    bg: "bg-[#ECFDF5] dark:bg-[#143528]",
    text: "text-[#047857] dark:text-[#6EE7B7]",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-[#047857] dark:bg-[#6EE7B7]",
  },
  html: {
    label: "HTML",
    bg: "bg-[#FFF1F2] dark:bg-[#3A141A]",
    text: "text-[#E11D48] dark:text-[#FB7185]",
    border: "border-rose-200 dark:border-rose-500/20",
    dot: "bg-[#E11D48] dark:bg-[#FB7185]",
  },
  css: {
    label: "CSS",
    bg: "bg-[#ECFEFF] dark:bg-[#142E35]",
    text: "text-[#0891B2] dark:text-[#22D3EE]",
    border: "border-cyan-200 dark:border-cyan-500/20",
    dot: "bg-[#0891B2] dark:bg-[#22D3EE]",
  },
};

export function CodeLabInstructorClient({
  institute,
  problems,
  submissions,
}: CodeLabInstructorClientProps) {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<InstructorSubmissionRecord[]>(submissions);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"cohort" | "mastery" | "triage">("cohort");
  const [selectedMasteryLang, setSelectedMasteryLang] = useState<string>("all");
  const [alertSentStudentId, setAlertSentStudentId] = useState<string | null>(null);

  // Table filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [onlyFlagged, setOnlyFlagged] = useState<boolean>(false);
  const [onlyRejected, setOnlyRejected] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Invalidation / Rejection Modal State
  const [selectedSub, setSelectedSub] = useState<InstructorSubmissionRecord | null>(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState<string>(
    "Suspicious copy-paste velocity detected"
  );
  const [rejectCustomNote, setRejectCustomNote] = useState<string>("");
  const [rejectAction, setRejectAction] = useState<"reject" | "delete" | "restore">("reject");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Filtered submissions for table & analytics
  const filteredSubmissions = useMemo(() => {
    return records.filter((s) => {
      if (selectedLanguage !== "all" && s.language.toLowerCase() !== selectedLanguage.toLowerCase()) {
        return false;
      }
      if (onlyFlagged && !s.isFlagged) {
        return false;
      }
      if (onlyRejected && !s.isRejected) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.studentName.toLowerCase().includes(q);
        const matchesProb = s.problemTitle.toLowerCase().includes(q);
        const matchesNum = s.studentNumber ? s.studentNumber.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesProb && !matchesNum) return false;
      }
      return true;
    });
  }, [records, selectedLanguage, onlyFlagged, onlyRejected, searchQuery]);

  // Aggregate Overview Metrics
  const totalAttempts = records.length;
  const passedCount = records.filter((s) => s.passed && !s.isRejected).length;
  const flaggedCount = records.filter((s) => s.isFlagged && !s.isRejected).length;
  const rejectedCount = records.filter((s) => s.isRejected).length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(records.reduce((sum, s) => sum + s.score, 0) / totalAttempts)
      : 0;
  const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

  // Class Median Completion Time
  const classMedianTimeSec = useMemo(() => {
    if (records.length === 0) return 60;
    const times = records
      .map((r) => r.completionTimeSeconds)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
    if (times.length === 0) return 60;
    const mid = Math.floor(times.length / 2);
    return times.length % 2 !== 0 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
  }, [records]);

  // Tab 2: Error Archetype Donut
  const errorSegments = useMemo(() => {
    const counts: Record<string, number> = {
      syntax: 0,
      type_error: 0,
      runtime: 0,
      tle: 0,
      assertion: 0,
      compile: 0,
    };

    const targetSubs =
      selectedMasteryLang === "all"
        ? records
        : records.filter((s) => s.language.toLowerCase() === selectedMasteryLang.toLowerCase());

    targetSubs.forEach((s) => {
      (s.errorTypes ?? []).forEach((t) => {
        if (t in counts) counts[t]++;
        else counts.syntax++;
      });
      // Infer from score if no explicit error types were logged
      if (!s.passed && (!s.errorTypes || s.errorTypes.length === 0)) {
        if (s.score === 0) counts.syntax++;
        else counts.assertion++;
      }
    });

    return [
      { label: "Syntax Error", value: counts.syntax, color: "#ef4444" },
      { label: "Type Error", value: counts.type_error, color: "#f97316" },
      { label: "Runtime / Null", value: counts.runtime, color: "#eab308" },
      { label: "Infinite Loop / TLE", value: counts.tle, color: "#8b5cf6" },
      { label: "Wrong Answer", value: counts.assertion, color: "#3b82f6" },
      { label: "Compile Error", value: counts.compile, color: "#ec4899" },
    ].filter((seg) => seg.value > 0);
  }, [records, selectedMasteryLang]);

  // Tab 2: Skill Pillars (6 Stages: Levels 1-5, 6-10, 11-15, 16-20, 21-25, 26-30)
  const skillPillars = useMemo(() => {
    const pillars = [
      { label: "Variables & Output", range: "1–5", minLevel: 1, maxLevel: 5 },
      { label: "Control Flow & Logic", range: "6–10", minLevel: 6, maxLevel: 10 },
      { label: "Collections & Loops", range: "11–15", minLevel: 11, maxLevel: 15 },
      { label: "Functions & Scope", range: "16–20", minLevel: 16, maxLevel: 20 },
      { label: "OOP & Structure", range: "21–25", minLevel: 21, maxLevel: 25 },
      { label: "Algorithms & Efficiency", range: "26–30", minLevel: 26, maxLevel: 30 },
    ];

    const targetSubs =
      selectedMasteryLang === "all"
        ? records
        : records.filter((s) => s.language.toLowerCase() === selectedMasteryLang.toLowerCase());

    return pillars.map((p) => {
      const subsInRange = targetSubs.filter(
        (s) => s.level && s.level >= p.minLevel && s.level <= p.maxLevel
      );
      const avg =
        subsInRange.length > 0
          ? Math.round(subsInRange.reduce((sum, s) => sum + s.score, 0) / subsInRange.length)
          : 0;
      return {
        ...p,
        avgScore: avg,
        attempts: subsInRange.length,
      };
    });
  }, [records, selectedMasteryLang]);

  // Tab 2: Behavioral Forensic Metrics
  const behavioralStats = useMemo(() => {
    const targetSubs =
      selectedMasteryLang === "all"
        ? records
        : records.filter((s) => s.language.toLowerCase() === selectedMasteryLang.toLowerCase());

    const total = targetSubs.length;
    if (total === 0) {
      return { hintRate: 0, avgChurn: 0, avgFirstRunSec: 0, pasteRate: 0 };
    }

    const hintCount = targetSubs.filter((s) => s.hintUsed).length;
    const totalChurn = targetSubs.reduce((sum, s) => sum + (s.attemptChurnCount || s.attempts || 1), 0);
    const firstRuns = targetSubs.map((s) => s.firstRunMs || s.completionTimeSeconds * 300).filter((t) => t > 0);
    const avgFirstRun =
      firstRuns.length > 0 ? Math.round(firstRuns.reduce((a, b) => a + b, 0) / firstRuns.length / 1000) : 18;
    const pasteCount = targetSubs.filter((s) => s.pasteCount > 0).length;

    return {
      hintRate: Math.round((hintCount / total) * 100),
      avgChurn: Math.round((totalChurn / total) * 10) / 10,
      avgFirstRunSec: avgFirstRun,
      pasteRate: Math.round((pasteCount / total) * 100),
    };
  }, [records, selectedMasteryLang]);

  // Tab 2: Time to First Run Distribution
  const timeToFirstRunBuckets = useMemo(() => {
    const buckets = [
      { label: "< 30s (Quick Starter)", count: 0, color: "bg-emerald-500" },
      { label: "30s – 2min (Normal)", count: 0, color: "bg-blue-500" },
      { label: "2min – 5min (Cautious)", count: 0, color: "bg-amber-500" },
      { label: "> 5min (Hesitant / Blocked)", count: 0, color: "bg-rose-500" },
    ];

    records.forEach((s) => {
      const ms = s.firstRunMs || s.completionTimeSeconds * 400;
      const sec = ms / 1000;
      if (sec < 30) buckets[0].count++;
      else if (sec <= 120) buckets[1].count++;
      else if (sec <= 300) buckets[2].count++;
      else buckets[3].count++;
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxCount };
  }, [records]);

  // Tab 3: At-Risk Student Matrix
  const atRiskStudents = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentNumber: string | null;
        totalScore: number;
        totalTime: number;
        attempts: number;
        passedCount: number;
        flagCount: number;
      }
    >();

    records.forEach((s) => {
      const cur = map.get(s.studentId) ?? {
        studentId: s.studentId,
        studentName: s.studentName,
        studentNumber: s.studentNumber,
        totalScore: 0,
        totalTime: 0,
        attempts: 0,
        passedCount: 0,
        flagCount: 0,
      };
      cur.totalScore += s.score;
      cur.totalTime += s.completionTimeSeconds;
      cur.attempts += 1;
      if (s.passed) cur.passedCount += 1;
      if (s.isFlagged) cur.flagCount += 1;
      map.set(s.studentId, cur);
    });

    return Array.from(map.values())
      .map((st) => {
        const avgScore = Math.round(st.totalScore / st.attempts);
        const avgTime = Math.round(st.totalTime / st.attempts);

        let riskLevel: "high" | "medium" | "low" = "low";
        if (avgTime > classMedianTimeSec * 3 && avgScore < 50) {
          riskLevel = "high";
        } else if (avgTime > classMedianTimeSec * 2 || avgScore < 60) {
          riskLevel = "medium";
        }

        return {
          ...st,
          avgScore,
          avgTime,
          riskLevel,
        };
      })
      .sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel] || a.avgScore - b.avgScore;
      });
  }, [records, classMedianTimeSec]);

  // Tab 3: Integrity Forensics Counts
  const integrityCounts = useMemo(() => {
    const pasteUsers = new Set(records.filter((r) => r.pasteCount > 0).map((r) => r.studentId)).size;
    const velocityUsers = new Set(records.filter((r) => r.typingVelocityCpm > 800).map((r) => r.studentId)).size;
    const multiFlagUsers = new Set(
      records.filter((r) => r.pasteCount > 0 && r.typingVelocityCpm > 800).map((r) => r.studentId)
    ).size;

    return { pasteUsers, velocityUsers, multiFlagUsers };
  }, [records]);

  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null);

  const handleProcessAction = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    setStatusMsg(null);

    const fullReason = rejectCustomNote.trim()
      ? `${rejectReasonPreset} — ${rejectCustomNote.trim()}`
      : rejectReasonPreset;

    try {
      const res = await fetch("/api/codelab/instructor/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedSub.id,
          action: rejectAction,
          reason: fullReason,
          instituteCode: institute,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMsg(data.message);
        toast.success(
          rejectAction === "reject"
            ? "Submission Invalidated"
            : rejectAction === "restore"
            ? "Submission Restored"
            : "Attempt Deleted",
          `Student ${selectedSub.studentName} has been notified.`
        );

        // Optimistic state updates
        if (rejectAction === "delete") {
          setRecords((prev) => prev.filter((s) => s.id !== selectedSub.id));
        } else if (rejectAction === "reject") {
          setRecords((prev) =>
            prev.map((s) =>
              s.id === selectedSub.id
                ? {
                    ...s,
                    score: 0,
                    passed: false,
                    isRejected: true,
                    rejectionReason: fullReason,
                  }
                : s
            )
          );
        } else if (rejectAction === "restore") {
          setRecords((prev) =>
            prev.map((s) =>
              s.id === selectedSub.id
                ? {
                    ...s,
                    score: 100,
                    passed: true,
                    isRejected: false,
                    rejectionReason: undefined,
                  }
                : s
            )
          );
        }

        setTimeout(() => {
          setSelectedSub(null);
          setStatusMsg(null);
          setRejectCustomNote("");
        }, 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Action Failed", data.error || "Could not process submission change.");
      }
    } catch (err) {
      console.error("Action failed:", err);
      toast.error("Network Error", "Could not communicate with the server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendAlert = async (st: {
    studentId: string;
    studentName: string;
    riskLevel: "high" | "medium" | "low";
    avgScore: number;
  }) => {
    setIsSendingAlert(st.studentId);
    try {
      const res = await fetch("/api/codelab/instructor/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: st.studentId,
          studentName: st.studentName,
          riskLevel: st.riskLevel,
          avgScore: st.avgScore,
          instituteCode: institute,
        }),
      });

      if (res.ok) {
        setAlertSentStudentId(st.studentId);
        toast.success("Alert Sent Successfully", `Delivered academic alert to ${st.studentName}'s Notification Bell.`);
        setTimeout(() => {
          setAlertSentStudentId(null);
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Failed to Send Alert", data.error || "Please try again.");
      }
    } catch (err) {
      console.error("Alert failed:", err);
      toast.error("Network Error", "Could not dispatch alert notification.");
    } finally {
      setIsSendingAlert(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-2 sm:px-4 page-enter">
      {/* ──── Invalidation Modal (Portaled to document.body) ──── */}
      {mounted &&
        selectedSub &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">Manage Submission Attempt</h3>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                      {selectedSub.studentName} &bull; {selectedSub.problemTitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Toast Notification inside Modal */}
              {statusMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {/* Forensic Details Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1E2132]/60 border border-slate-200/80 dark:border-white/5 space-y-2 text-xs">
                <div className="font-bold text-slate-700 dark:text-[#F0F2F8]">Detected Telemetry Flags:</div>
                {selectedSub.flagReasons.length > 0 ? (
                  <ul className="space-y-1 text-rose-600 dark:text-rose-400 font-semibold list-disc pl-4">
                    {selectedSub.flagReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-500 dark:text-[#8B92A5]">No automated flags triggered.</div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-[#8B92A5]">
                  <span>Paste events: {selectedSub.pasteCount}</span>
                  <span>Typing velocity: {selectedSub.typingVelocityCpm} cpm</span>
                  <span>Score: {selectedSub.score}%</span>
                </div>
              </div>

              {/* Actions Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-[#F0F2F8]">Choose Action:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectAction("reject")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      rejectAction === "reject"
                        ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-[#8B92A5] hover:border-slate-300"
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>Invalidate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectAction("restore")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      rejectAction === "restore"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-[#8B92A5] hover:border-slate-300"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectAction("delete")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      rejectAction === "delete"
                        ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-xs"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-[#8B92A5] hover:border-slate-300"
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Purge Record</span>
                  </button>
                </div>
              </div>

              {/* Reason Presets */}
              {rejectAction === "reject" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#F0F2F8]">Rejection Reason:</label>
                  <select
                    value={rejectReasonPreset}
                    onChange={(e) => setRejectReasonPreset(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Suspicious copy-paste velocity detected">
                      Suspicious copy-paste velocity detected
                    </option>
                    <option value="Uncharacteristically high typing speed (>800 cpm)">
                      Uncharacteristically high typing speed (&gt;800 cpm)
                    </option>
                    <option value="Plagiarism or external code ingestion detected">
                      Plagiarism or external code ingestion detected
                    </option>
                    <option value="Academic Integrity Violation — Retake Required">
                      Academic Integrity Violation — Retake Required
                    </option>
                  </select>

                  <input
                    type="text"
                    placeholder="Optional instructor note to student..."
                    value={rejectCustomNote}
                    onChange={(e) => setRejectCustomNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-[#F0F2F8] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              )}

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#8B92A5] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessAction}
                  disabled={isProcessing}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    rejectAction === "reject"
                      ? "bg-rose-500 hover:bg-rose-600"
                      : rejectAction === "restore"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {rejectAction === "reject"
                      ? "Confirm Invalidation"
                      : rejectAction === "restore"
                      ? "Confirm Restore"
                      : "Confirm Delete"}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] mb-1">
            <Link
              href={`/${institute}/activities/codelab`}
              className="hover:text-[#F97316] transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to CodeLab Tracks</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight">
            CodeLab Instructor Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B92A5] mt-0.5">
            Cohort health telemetry, language mastery analytics, at-risk student triage, and submission logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${institute}/activities/codelab`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Launch CodeLab</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──── Analytics Navigation Tabs Bar ──── */}
      <div className="flex gap-1.5 p-1.5 bg-slate-100 dark:bg-[#141721] rounded-2xl w-fit border border-slate-200/60 dark:border-white/5">
        {[
          { key: "cohort", label: "Cohort Health & Chokepoints", icon: TrendingUp },
          { key: "mastery", label: "Language Mastery & Errors", icon: Code2 },
          { key: "triage", label: "Student Triage", icon: ShieldAlert },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveAnalyticsTab(key as typeof activeAnalyticsTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeAnalyticsTab === key
                ? "bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-[#F0F2F8] shadow-sm"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ──── TAB 1: COHORT HEALTH & CHOKEPOINTS ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeAnalyticsTab === "cohort" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 5 Metric Overview Cards with CountUpNumber */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Attempts</span>
              </div>
              <CountUpNumber
                value={totalAttempts}
                className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8] block"
              />
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <span>Average</span>
              </div>
              <CountUpNumber
                value={avgScore}
                suffix="%"
                className="text-2xl sm:text-3xl font-black text-emerald-500 block"
              />
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span>Pass Rate</span>
              </div>
              <CountUpNumber
                value={passRate}
                suffix="%"
                className="text-2xl sm:text-3xl font-black text-amber-500 block"
              />
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <span>Flags</span>
              </div>
              <CountUpNumber
                value={flaggedCount}
                className="text-2xl sm:text-3xl font-black text-rose-500 block"
              />
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                  <Ban className="w-3.5 h-3.5" />
                </div>
                <span>Invalidated</span>
              </div>
              <CountUpNumber
                value={rejectedCount}
                className="text-2xl sm:text-3xl font-black text-red-500 block"
              />
            </div>
          </div>

          {/* Funnel & Progression Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelChart submissions={filteredSubmissions} />

            {/* Median Time per Level Bar Chart */}
            <div className="p-6 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                  ⏱️ Median Completion Time by Stage
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Cohort pacing across 6 pedagogical skill milestones
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { stage: "Basics (Levels 1–5)", min: 1, max: 5, expectedSec: 45 },
                  { stage: "Control Flow (Levels 6–10)", min: 6, max: 10, expectedSec: 90 },
                  { stage: "Collections (Levels 11–15)", min: 11, max: 15, expectedSec: 150 },
                  { stage: "Functions (Levels 16–20)", min: 16, max: 20, expectedSec: 210 },
                  { stage: "Structures & OOP (Levels 21–25)", min: 21, max: 25, expectedSec: 300 },
                  { stage: "Algorithms (Levels 26–30)", min: 26, max: 30, expectedSec: 420 },
                ].map(({ stage, min, max, expectedSec }) => {
                  const subs = records.filter(
                    (s) => s.level && s.level >= min && s.level <= max
                  );
                  const median =
                    subs.length > 0
                      ? Math.round(
                          subs.reduce((acc, s) => acc + s.completionTimeSeconds, 0) / subs.length
                        )
                      : expectedSec;
                  const pct = Math.min(Math.round((median / 480) * 100), 100);

                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-[#F0F2F8]">{stage}</span>
                        <span className="font-mono text-slate-500 dark:text-[#8B92A5] font-bold">
                          {Math.floor(median / 60)}m {median % 60}s avg
                        </span>
                      </div>
                      <AnimatedBar
                        percent={pct}
                        colorClass={median <= 120 ? "bg-emerald-500" : median <= 240 ? "bg-amber-500" : "bg-rose-500"}
                        heightClass="h-2.5"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-[#8B92A5] flex items-center justify-between">
                <span>Class Median Baseline:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-[#F0F2F8]">
                  {Math.floor(classMedianTimeSec / 60)}m {classMedianTimeSec % 60}s per challenge
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Mastery Heatmap with Language Tabs */}
          <MasteryHeatmap problems={problems} submissions={filteredSubmissions} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ──── TAB 2: LANGUAGE MASTERY & ERROR ANALYTICS ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeAnalyticsTab === "mastery" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Language Filter for Tab 2 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight">
                Language Diagnostic &amp; Cognitive Errors
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Identify recurring conceptual bottlenecks and syntax misconceptions across tracks
              </p>
            </div>
            <select
              value={selectedMasteryLang}
              onChange={(e) => setSelectedMasteryLang(e.target.value)}
              className="bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] cursor-pointer focus:outline-none shadow-xs"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="sql">SQL</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
          </div>

          {/* Row 1: Error Archetypes Donut & Skill Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Error Donut */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                  🍩 Error Archetype Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Breakdown of runtime and syntax error root causes
                </p>
              </div>

              <div className="py-2">
                <AnimatedDonut
                  segments={errorSegments}
                  size={170}
                  strokeWidth={24}
                  centerLabel="Total Errors"
                  centerValue={errorSegments.reduce((sum, s) => sum + s.value, 0)}
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-[#8B92A5] p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                💡 Tip: High Wrong Answer rates indicate algorithmic edge-case gaps rather than syntax barriers.
              </div>
            </div>

            {/* Skill Pillar Breakdown */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                    📊 Skill Pillar Mastery Radar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                    Class competency benchmarked across core curriculum pillars
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-3.5 pt-1">
                {skillPillars.map(({ label, avgScore, range, attempts }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">{label}</span>
                      <span className="font-bold text-slate-500 dark:text-[#8B92A5]">
                        Levels {range} &bull; <CountUpNumber value={avgScore} suffix="%" /> ({attempts} att)
                      </span>
                    </div>
                    <AnimatedBar
                      percent={avgScore}
                      colorClass={
                        avgScore >= 80 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }
                      heightClass="h-3"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Behavioral Metrics & Time-to-First-Run */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4 Behavioral Metric Cards */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3.5">
              <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hint Usage Rate</span>
                </div>
                <CountUpNumber
                  value={behavioralStats.hintRate}
                  suffix="%"
                  className="text-2xl font-black text-amber-500 block"
                />
                <p className="text-[10px] text-slate-400 dark:text-[#555C72]">Unlocked pedagogical guidance</p>
              </div>

              <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span>Avg Attempt Churn</span>
                </div>
                <CountUpNumber
                  value={behavioralStats.avgChurn}
                  decimals={1}
                  className="text-2xl font-black text-blue-500 block"
                />
                <p className="text-[10px] text-slate-400 dark:text-[#555C72]">Runs before solving level</p>
              </div>

              <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Avg Time to 1st Run</span>
                </div>
                <CountUpNumber
                  value={behavioralStats.avgFirstRunSec}
                  suffix="s"
                  className="text-2xl font-black text-emerald-500 block"
                />
                <p className="text-[10px] text-slate-400 dark:text-[#555C72]">Planning vs trial delay</p>
              </div>

              <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-rose-500" />
                  <span>Paste Incidence</span>
                </div>
                <CountUpNumber
                  value={behavioralStats.pasteRate}
                  suffix="%"
                  className="text-2xl font-black text-rose-500 block"
                />
                <p className="text-[10px] text-slate-400 dark:text-[#555C72]">Submissions with copy-paste</p>
              </div>
            </div>

            {/* Time to First Run Distribution */}
            <div className="lg:col-span-6 p-6 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                  ⏳ Time-to-First-Run Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  How long students spend reading the prompt and drafting before pressing "Run"
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {timeToFirstRunBuckets.buckets.map(({ label, count, color }) => {
                  const pct = Math.round((count / timeToFirstRunBuckets.maxCount) * 100);
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-[#F0F2F8]">{label}</span>
                        <span className="font-mono text-slate-500 dark:text-[#8B92A5] font-bold">
                          {count} students
                        </span>
                      </div>
                      <AnimatedBar percent={pct} colorClass={color} heightClass="h-2.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ──── TAB 3: STUDENT TRIAGE & AT-RISK RADAR ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeAnalyticsTab === "triage" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Integrity Forensics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-amber-500/20 rounded-2xl space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Paste Flagged Students</span>
              </div>
              <CountUpNumber
                value={integrityCounts.pasteUsers}
                className="text-3xl font-black text-slate-900 dark:text-[#F0F2F8] block"
              />
              <p className="text-[10px] text-slate-400 dark:text-[#555C72]">
                External clipboard ingestion detected during session
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-rose-500/20 rounded-2xl space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>High Velocity (&gt;800 CPM)</span>
              </div>
              <CountUpNumber
                value={integrityCounts.velocityUsers}
                className="text-3xl font-black text-slate-900 dark:text-[#F0F2F8] block"
              />
              <p className="text-[10px] text-slate-400 dark:text-[#555C72]">
                Typing velocity indicative of automated injection
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1A1D27] border border-red-500/30 rounded-2xl space-y-1.5 shadow-xs bg-red-500/5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4" />
                <span>Highest Risk (Dual Flag)</span>
              </div>
              <CountUpNumber
                value={integrityCounts.multiFlagUsers}
                className="text-3xl font-black text-red-500 block"
              />
              <p className="text-[10px] text-slate-400 dark:text-[#555C72]">
                Triggered both paste and velocity anomalies
              </p>
            </div>
          </div>

          {/* At-Risk Student Matrix Table */}
          <div className="p-6 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                  ⚠️ At-Risk Student Triage Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Identifies students with prolonged struggle (&gt;3&times; median time) or critical score deficits
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-[#8B92A5] font-semibold">
                Class Median: {Math.floor(classMedianTimeSec / 60)}m {classMedianTimeSec % 60}s
              </div>
            </div>

            {atRiskStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No student submission records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E6EF] dark:border-white/5 text-[11px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Avg Score</th>
                      <th className="py-2.5 px-3">Avg Time</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">Risk Level</th>
                      <th className="py-2.5 px-3 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {atRiskStudents.slice(0, 15).map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-[#F0F2F8]">{st.studentName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#555C72] font-mono">
                            {st.studentNumber || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              st.avgScore >= 80
                                ? "text-emerald-500"
                                : st.avgScore >= 50
                                ? "text-amber-500"
                                : "text-rose-500"
                            }`}
                          >
                            {st.avgScore}%
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-[#8B92A5]">
                          {Math.floor(st.avgTime / 60)}m {st.avgTime % 60}s
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-[#8B92A5]">{st.attempts}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.riskLevel === "high"
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : st.riskLevel === "medium"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}
                          >
                            {st.riskLevel === "high" ? "🔴 High" : st.riskLevel === "medium" ? "🟡 Medium" : "🟢 Low"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={isSendingAlert === st.studentId}
                            onClick={() => handleSendAlert(st)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-[#F97316] hover:text-white dark:hover:bg-[#F97316] text-slate-700 dark:text-[#F0F2F8] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSendingAlert === st.studentId ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : alertSentStudentId === st.studentId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Alert Sent!</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Send Alert</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Calendar Heatmap */}
          <CalendarHeatmap submissions={filteredSubmissions} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ──── SUBMISSIONS LOG TABLE (Preserved in full) ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-4 border-t border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight">
              Student Submissions Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              Review forensic keystroke velocity, integrity telemetry, and manage attempts.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 dark:text-[#8B92A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or problem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 dark:placeholder:text-[#555C72] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] shadow-xs"
              />
            </div>

            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] shadow-xs cursor-pointer"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="sql">SQL</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>

            {/* Flagged Toggle */}
            <button
              type="button"
              onClick={() => setOnlyFlagged((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyFlagged
                  ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "bg-white dark:bg-[#1A1D27] border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] text-slate-600 dark:text-[#8B92A5] hover:border-slate-300"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flagged Only</span>
            </button>

            {/* Rejected Toggle */}
            <button
              type="button"
              onClick={() => setOnlyRejected((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyRejected
                  ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-xs"
                  : "bg-white dark:bg-[#1A1D27] border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] text-slate-600 dark:text-[#8B92A5] hover:border-slate-300"
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Invalidated Only</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl overflow-hidden shadow-xs">
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-[#555C72] text-xs font-medium">
              No submissions match your active filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E4E6EF] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-[11px] font-bold text-slate-400 dark:text-[#555C72] uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Forensic Telemetry</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredSubmissions.map((sub) => {
                    const langBadge =
                      LANGUAGE_BADGES[sub.language.toLowerCase()] || LANGUAGE_BADGES.python;
                    const mins = Math.floor(sub.completionTimeSeconds / 60);
                    const secs = sub.completionTimeSeconds % 60;
                    const formattedTime = `${mins}m ${secs}s`;

                    return (
                      <tr
                        key={sub.id}
                        className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                          sub.isRejected ? "opacity-60 bg-red-500/[0.02]" : ""
                        }`}
                      >
                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-[#F0F2F8]">{sub.studentName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#555C72] font-mono">
                            {sub.studentNumber || "N/A"}
                          </div>
                        </td>

                        {/* Problem */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-[#F0F2F8]">
                          {sub.problemTitle}
                        </td>

                        {/* Language */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${langBadge.bg} ${langBadge.text} ${langBadge.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${langBadge.dot}`} />
                            {langBadge.label}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4">
                          {sub.isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                              <Ban className="w-3 h-3" />
                              Invalidated
                            </span>
                          ) : (
                            <span
                              className={`font-black text-sm ${
                                sub.score >= 80
                                  ? "text-emerald-500"
                                  : sub.score >= 50
                                  ? "text-amber-500"
                                  : "text-rose-500"
                              }`}
                            >
                              {sub.score}%
                            </span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-[#8B92A5] font-mono text-[11px]">
                          {formattedTime}
                        </td>

                        {/* Telemetry Flags */}
                        <td className="py-3.5 px-4">
                          {sub.isFlagged ? (
                            <div className="space-y-1">
                              {sub.flagReasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mr-1"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  {r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Clean
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-400 dark:text-[#555C72] text-[11px] whitespace-nowrap">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSub(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-[#F0F2F8] transition-colors cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeLabInstructorClient;
