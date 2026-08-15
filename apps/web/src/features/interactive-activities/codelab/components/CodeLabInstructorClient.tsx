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
} from "lucide-react";

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
};

export function CodeLabInstructorClient({
  institute,
  problems,
  submissions,
}: CodeLabInstructorClientProps) {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<InstructorSubmissionRecord[]>(submissions);
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

  // Filtered submissions
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

  // Aggregate Metrics
  const totalAttempts = records.length;
  const passedCount = records.filter((s) => s.passed && !s.isRejected).length;
  const flaggedCount = records.filter((s) => s.isFlagged && !s.isRejected).length;
  const rejectedCount = records.filter((s) => s.isRejected).length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(records.reduce((sum, s) => sum + s.score, 0) / totalAttempts)
      : 0;
  const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

  // 30 Problem Heatmap Metrics Map
  const problemMetrics = useMemo(() => {
    const map = new Map<string, { totalScore: number; count: number }>();
    records.forEach((s) => {
      const cur = map.get(s.templateId) || { totalScore: 0, count: 0 };
      cur.totalScore += s.score;
      cur.count += 1;
      map.set(s.templateId, cur);
    });
    return map;
  }, [records]);

  const handleProcessAction = async () => {
    if (!selectedSub) return;
    setIsProcessing(true);
    setStatusMsg(null);

    const fullReason = rejectCustomNote.trim()
      ? `${rejectReasonPreset} — ${rejectCustomNote.trim()}`
      : rejectReasonPreset;

    try {
      const res = await fetch("/api/activities/codelab/invalidate", {
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
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-2 sm:px-4 page-enter">
      {/* ──── Invalidation Modal (Portaled to document.body) ──── */}
      {mounted && selectedSub && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-[#F0F2F8]">
                    Manage Attempt Validity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                    Review, invalidate, or restore student attempt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Submission Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-[#181B26] rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-[#F0F2F8] text-sm">
                  {selectedSub.studentName}
                </span>
                <span className="font-mono text-slate-600 dark:text-[#8B92A5] bg-white dark:bg-[#1E2132] px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10 font-medium">
                  {selectedSub.studentNumber || selectedSub.studentId}
                </span>
              </div>
              <div className="text-slate-600 dark:text-[#8B92A5]">
                Problem: <span className="text-slate-900 dark:text-[#F0F2F8] font-bold">{selectedSub.problemTitle}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 dark:text-[#8B92A5] pt-2 border-t border-slate-200/80 dark:border-white/5">
                <span>Score: <strong className="text-slate-900 dark:text-[#F0F2F8]">{selectedSub.score}%</strong></span>
                <span>Language: <strong className="text-slate-900 dark:text-[#F0F2F8] uppercase">{selectedSub.language}</strong></span>
                {selectedSub.isFlagged && (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Integrity Flagged
                  </span>
                )}
              </div>
            </div>

            {/* Action Type Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8B92A5] uppercase tracking-wider">
                Action Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRejectAction("reject")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rejectAction === "reject"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-slate-50 dark:bg-[#1E2132] text-slate-600 dark:text-[#8B92A5] border-slate-200/80 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Invalidate (0%)
                </button>
                <button
                  type="button"
                  onClick={() => setRejectAction("delete")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rejectAction === "delete"
                      ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50 dark:bg-[#1E2132] text-slate-600 dark:text-[#8B92A5] border-slate-200/80 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Delete Attempt
                </button>
                <button
                  type="button"
                  onClick={() => setRejectAction("restore")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rejectAction === "restore"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 dark:bg-[#1E2132] text-slate-600 dark:text-[#8B92A5] border-slate-200/80 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Restore Score
                </button>
              </div>
            </div>

            {/* Reason Selection (when rejecting) */}
            {rejectAction === "reject" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8B92A5] uppercase tracking-wider">
                    Reason Category
                  </label>
                  <select
                    value={rejectReasonPreset}
                    onChange={(e) => setRejectReasonPreset(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-xl p-3 text-xs text-slate-900 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Suspicious copy-paste velocity detected">Suspicious copy-paste velocity detected</option>
                    <option value="Plagiarism / External AI generated code">Plagiarism / External AI generated code</option>
                    <option value="Solution does not meet problem constraints">Solution does not meet problem constraints</option>
                    <option value="Attempt invalidated by instructor">Attempt invalidated by instructor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8B92A5] uppercase tracking-wider">
                    Custom Feedback / Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please re-attempt solving this problem manually without pasting blocks."
                    value={rejectCustomNote}
                    onChange={(e) => setRejectCustomNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-xl p-3 text-xs text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            {statusMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessAction}
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 disabled:opacity-40 shadow-xs cursor-pointer ${
                  rejectAction === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : rejectAction === "delete"
                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : rejectAction === "restore" ? (
                  <RotateCcw className="w-4 h-4" />
                ) : rejectAction === "delete" ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                <span>
                  {rejectAction === "restore"
                    ? "Confirm Restore"
                    : rejectAction === "delete"
                    ? "Confirm Delete"
                    : "Invalidate Attempt"}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] p-6 sm:p-8 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#F97316] mb-2">
            <Link
              href={`/${institute}/activities/codelab`}
              className="flex items-center gap-1.5 hover:underline transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Problem Bank
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-[#F97316] text-white shadow-sm">
              <Code2 className="w-6 h-6" />
            </div>
            CodeLab Instructor Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
            Real-time telemetry audit, 30-problem class mastery heatmap, and attempt invalidation controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${institute}/activities/codelab`}
            className="px-4 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <span>Solve in CodeLab</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──── Metric Overview Cards (5 Cards) ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span>Attempts</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8]">{totalAttempts}</div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Award className="w-3.5 h-3.5" />
            </div>
            <span>Average</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500">{avgScore}%</div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span>Pass Rate</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">{passRate}%</div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span>Flags</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-500">{flaggedCount}</div>
        </div>

        <div className="p-5 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <Ban className="w-3.5 h-3.5" />
            </div>
            <span>Invalidated</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-500">{rejectedCount}</div>
        </div>
      </div>

      {/* ──── Problem Mastery Heatmap (30 Problems) ──── */}
      <div className="p-6 sm:p-8 bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-3xl space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] uppercase tracking-wider">
                30-Problem Class Mastery Heatmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">Real-time cohort performance across every algorithmic challenge</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-[#8B92A5] font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" /> ≥80%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" /> 50–79%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40" /> &lt;50%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" /> Untested
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5 pt-1">
          {problems.map((p) => {
            const m = problemMetrics.get(p.id);
            const count = m?.count || 0;
            const avg = count > 0 ? Math.round(m!.totalScore / count) : null;

            let cellClass = "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-400 dark:text-[#555C72]";
            if (avg !== null) {
              if (avg >= 80) cellClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold";
              else if (avg >= 50) cellClass = "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold";
              else cellClass = "bg-rose-500/10 border-rose-500/30 text-rose-500 font-bold";
            }

            return (
              <div
                key={p.id}
                title={`${p.title} (Level ${p.level}): ${count} attempts, ${avg !== null ? `${avg}% class average` : "No attempts yet"}`}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-150 hover:scale-105 cursor-pointer shadow-xs ${cellClass}`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75">L{p.level}</span>
                <span className="text-sm font-black mt-0.5">{avg !== null ? `${avg}%` : "—"}</span>
                <span className="text-[10px] opacity-60 font-mono mt-0.5">{count} att</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──── Submissions Table ──── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight">Student Submissions Log</h2>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">Review forensic keystroke velocity, integrity telemetry, and manage attempts.</p>
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
            </select>

            {/* Flagged Filter */}
            <button
              onClick={() => setOnlyFlagged((p) => !p)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                onlyFlagged
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                  : "bg-white dark:bg-[#1A1D27] text-slate-600 dark:text-[#8B92A5] border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Flagged ({flaggedCount})</span>
            </button>

            {/* Rejected Filter */}
            <button
              onClick={() => setOnlyRejected((p) => !p)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                onlyRejected
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-white dark:bg-[#1A1D27] text-slate-600 dark:text-[#8B92A5] border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-red-500" />
              <span>Invalidated ({rejectedCount})</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white dark:bg-[#1A1D27] border border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E6EF] dark:border-[rgba(255,255,255,0.07)] bg-slate-50 dark:bg-[#22263A] text-[11px] font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Problem</th>
                <th className="py-3.5 px-4">Language</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Attempts</th>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Integrity Telemetry</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6EF]/60 dark:divide-[rgba(255,255,255,0.04)] text-slate-800 dark:text-[#F0F2F8]">
              {filteredSubmissions.map((sub) => {
                const langBadge = LANGUAGE_BADGES[sub.language.toLowerCase()] || LANGUAGE_BADGES.python;

                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02] ${
                      sub.isRejected
                        ? "bg-red-500/5"
                        : sub.isFlagged
                        ? "bg-rose-500/5"
                        : ""
                    }`}
                  >
                    {/* Student Info */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-[#F0F2F8] text-sm">{sub.studentName}</div>
                      {sub.studentNumber && (
                        <div className="text-[11px] text-slate-400 dark:text-[#8B92A5] font-mono mt-0.5">{sub.studentNumber}</div>
                      )}
                    </td>

                    {/* Problem */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-[#F0F2F8] text-sm">{sub.problemTitle}</div>
                      <div className="text-[10px] text-slate-400 dark:text-[#555C72] font-mono mt-0.5">{sub.templateId}</div>
                    </td>

                    {/* Language Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${langBadge.bg} ${langBadge.text} ${langBadge.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${langBadge.dot}`} />
                        {langBadge.label}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-4 px-4">
                      {sub.isRejected ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-xs line-through">
                            0%
                          </span>
                          <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                            Invalidated
                          </div>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg font-black text-xs border ${
                            sub.score === 100
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : sub.score >= 50
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          }`}
                        >
                          {sub.score}%
                        </span>
                      )}
                    </td>

                    {/* Attempts */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-[#8B92A5] text-xs">{sub.attempts}</td>

                    {/* Duration */}
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-[#8B92A5] text-xs">
                      {Math.floor(sub.completionTimeSeconds / 60)}m {sub.completionTimeSeconds % 60}s
                    </td>

                    {/* Integrity Telemetry */}
                    <td className="py-4 px-4">
                      {sub.isRejected ? (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-xs space-y-0.5">
                          <div className="font-bold flex items-center gap-1 text-red-500">
                            <Ban className="w-3.5 h-3.5" /> Attempt Invalidated
                          </div>
                          <div className="text-[11px] text-red-400 font-normal">
                            {sub.rejectionReason || "Invalidated by instructor."}
                          </div>
                        </div>
                      ) : sub.isFlagged ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sub.flagReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-500/20"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Clean
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-4 font-mono text-slate-400 dark:text-[#555C72] text-xs">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSub(sub);
                          setRejectAction(sub.isRejected ? "restore" : "reject");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-xs active:scale-95 ${
                          sub.isRejected
                            ? "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-[#E4E6EF] dark:border-white/10"
                            : "bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border-rose-500/20 hover:border-rose-600"
                        }`}
                      >
                        {sub.isRejected ? "Manage" : "Invalidate"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-[#555C72] text-sm font-medium">
                    No matching student submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
