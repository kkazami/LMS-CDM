"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { marked } from "marked";
import { CodeEditor } from "./CodeEditor";
import {
  useCodeLabStore,
  TestCase,
  TestCaseResult,
} from "../stores/codelab-store";
import {
  CodeLabLanguage,
  FuncSignature,
  JUDGE0_LANGUAGE_IDS,
} from "../utils/starter-code";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  AlertTriangle,
  Lock,
  Lightbulb,
  Sparkles,
  Loader2,
  Send,
  AlertOctagon,
} from "lucide-react";

export interface RejectionWarningInfo {
  isRejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
}

interface CodeLabSceneProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
  descriptionMarkdown: string;
  signature: FuncSignature;
  publicTestCases: TestCase[];
  templateTitle?: string;
  difficulty?: number;
  level?: number;
  tags?: string[];
  hintTemplate?: string;
  institute?: string;
  rejectionWarning?: RejectionWarningInfo | null;
}

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  easy: {
    label: "Easy",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  intermediate: {
    label: "Intermediate",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  hard: {
    label: "Hard",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
};

export default function CodeLabScene({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
  descriptionMarkdown,
  signature,
  publicTestCases,
  templateTitle = "CodeLab Problem",
  difficulty = 1,
  level = 1,
  tags = [],
  hintTemplate = "",
  institute = "ics",
  rejectionWarning = null,
}: CodeLabSceneProps) {
  const initialize = useCodeLabStore((s) => s.initialize);
  const {
    language,
    codeByLanguage,
    activeTab,
    setActiveTab,
    setExecuting,
    isExecuting,
    setConsoleOutput,
    consoleOutput,
    setTestResults,
    testResults,
    incrementSubmission,
    submissionCount,
    pasteCount,
    typedCharCount,
  } = useCodeLabStore();

  const {
    setScore,
    updateStateCheck,
    markComplete,
    elapsedSeconds,
    startTimer,
    score: currentScore,
  } = useActivityStore();

  const [mounted, setMounted] = useState<boolean>(false);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [hiddenResults, setHiddenResults] = useState<Array<{ passed: boolean; error?: string }>>([]);
  const [showRejectionWarning, setShowRejectionWarning] = useState<boolean>(
    Boolean(rejectionWarning?.isRejected)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse markdown description securely using marked
  const parsedDescription = useMemo(() => {
    try {
      return marked.parse(descriptionMarkdown) as string;
    } catch {
      return descriptionMarkdown;
    }
  }, [descriptionMarkdown]);

  useEffect(() => {
    initialize("python", signature, publicTestCases);
    startTimer();
  }, [initialize, signature, publicTestCases, startTimer]);

  // Format timer as MM:SS
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isTimeLong = elapsedSeconds > 30 * 60;

  // Derive tier name from level
  const tierKey = level <= 10 ? "easy" : level <= 20 ? "intermediate" : "hard";
  const tierMeta = TIER_CONFIG[tierKey] || TIER_CONFIG.easy;

  // Toggle individual test case accordion
  const toggleTest = (index: number) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Run single test (Freeform execution with stdout/stderr) */
  const handleRun = useCallback(async () => {
    if (isExecuting) return;

    setExecuting(true);
    setActiveTab("console");
    setConsoleOutput(null);

    const code = codeByLanguage[language];
    const langId = JUDGE0_LANGUAGE_IDS[language];

    try {
      const res = await fetch("/api/judge0/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: langId,
          stdin: publicTestCases[0]?.input || "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error || `HTTP ${res.status}`
        );
      }

      const result = await res.json();
      setConsoleOutput(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution failed";
      setConsoleOutput({
        stdout: null,
        stderr: message,
        compile_output: null,
        time: "0",
        memory: 0,
        status: { id: 13, description: "Execution Error" },
      });
    } finally {
      setExecuting(false);
    }
  }, [isExecuting, codeByLanguage, language, publicTestCases, setExecuting, setActiveTab, setConsoleOutput]);

  /** Full Evaluation (Runs against public + hidden test cases via /api/codelab/evaluate) */
  const handleSubmitAndEvaluate = useCallback(async () => {
    if (isExecuting) return;

    setExecuting(true);
    setActiveTab("tests");
    incrementSubmission();

    const code = codeByLanguage[language];
    const langId = JUDGE0_LANGUAGE_IDS[language];

    try {
      const res = await fetch("/api/codelab/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: assignmentId,
          seed: variantSeed,
          sourceCode: code,
          languageId: langId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as Record<string, string>).error || `HTTP ${res.status}`
        );
      }

      const data = (await res.json()) as {
        publicResults: Array<{
          passed: boolean;
          actualOutput: string;
          expectedOutput?: string;
          input?: string;
          error?: string;
          time: string;
        }>;
        hiddenResults: Array<{ passed: boolean; error?: string }>;
        totalPassed: number;
        totalCases: number;
        score: number;
      };

      // Map public results to store format
      const mapped: TestCaseResult[] = data.publicResults.map((r) => ({
        passed: r.passed,
        actualOutput: r.actualOutput,
        error: r.error,
        time: r.time,
      }));

      setTestResults(mapped);
      setHiddenResults(data.hiddenResults);

      // Telemetry & anti-cheat records
      const cpm = elapsedSeconds > 0 ? Math.round((typedCharCount / elapsedSeconds) * 60) : 0;
      setScore(data.score);
      updateStateCheck("language", language);
      updateStateCheck("pasteCount", pasteCount);
      updateStateCheck("typingVelocityCharsPerMin", cpm);
      updateStateCheck("totalPassed", data.totalPassed);
      updateStateCheck("totalCases", data.totalCases);

      if (data.score === 100) {
        markComplete(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Evaluation failed";
      setTestResults([
        {
          passed: false,
          actualOutput: null,
          error: message,
        },
      ]);
    } finally {
      setExecuting(false);
    }
  }, [
    isExecuting,
    codeByLanguage,
    language,
    assignmentId,
    variantSeed,
    pasteCount,
    typedCharCount,
    elapsedSeconds,
    setExecuting,
    setActiveTab,
    incrementSubmission,
    setTestResults,
    setScore,
    updateStateCheck,
    markComplete,
  ]);

  const publicPassedCount = testResults.filter((r) => r.passed).length;
  const hiddenPassedCount = hiddenResults.filter((r) => r.passed).length;
  const totalPassedCount = publicPassedCount + hiddenPassedCount;
  const totalTestsCount = testResults.length + hiddenResults.length;

  // Share Milestone Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [courses, setCourses] = useState<Array<{ id: string; title: string; code: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [shareCustomNote, setShareCustomNote] = useState<string>("");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);

  const openShareModal = async () => {
    setIsShareModalOpen(true);
    setShareSuccessMessage(null);
    try {
      const res = await fetch("/api/codelab/courses");
      if (res.ok) {
        const data = await res.json();
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses);
          setSelectedCourseId(data.courses[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load courses for sharing", err);
    }
  };

  const handleBroadcastMilestone = async () => {
    if (!selectedCourseId) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/codelab/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          problemId: assignmentId,
          problemTitle: templateTitle,
          level,
          tier: tierKey,
          language,
          score: currentScore,
          customMessage: shareCustomNote,
          instituteCode: institute,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShareSuccessMessage(data.message || "Achievement broadcasted to class!");
        setTimeout(() => {
          setIsShareModalOpen(false);
          setShareSuccessMessage(null);
          setShareCustomNote("");
        }, 1800);
      }
    } catch (err) {
      console.error("Broadcast failed", err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex-col select-none relative transition-colors duration-200">
      {/* ──── Academic Integrity / Rejection Warning Modal ──── */}
      {mounted && showRejectionWarning && rejectionWarning?.isRejected && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-rose-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3.5 border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40">
                    Attempt Invalidated
                  </span>
                  {rejectionWarning.rejectedAt && (
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(rejectionWarning.rejectedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-[#F0F2F8]">
                  Submission Invalidated by Instructor
                </h2>
              </div>
            </div>

            {/* Warning Message Box */}
            <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-500/30 rounded-2xl space-y-2 text-xs">
              <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Instructor Feedback & Reason:
              </div>
              <p className="text-slate-800 dark:text-[#F0F2F8] bg-white dark:bg-[#181B26] p-3 rounded-xl border border-rose-100 dark:border-white/10 font-medium leading-relaxed">
                "{rejectionWarning.rejectionReason || "Attempt invalidated due to integrity anomaly or rule non-compliance."}"
              </p>
            </div>

            {/* Code of Conduct & Guidelines */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-[#8B92A5] bg-slate-50 dark:bg-[#181B26] p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <div className="font-bold text-slate-800 dark:text-[#F0F2F8] uppercase tracking-wider text-[11px]">
                Integrity & Re-Attempt Guidelines:
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-[#8B92A5] list-disc list-inside">
                <li>Formulate and type your solution directly in the CodeLab editor.</li>
                <li>Avoid copying and pasting full code solutions from external tools.</li>
                <li>Ensure all algorithmic constraints and test requirements are satisfied.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
              <Link
                href={`/${institute}/activities/codelab`}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Back to Problem Bank
              </Link>
              <button
                onClick={() => setShowRejectionWarning(false)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>I Understand — Start Re-Attempt</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ──── Share to Course Modal ──── */}
      {mounted && isShareModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/20 text-orange-600">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-[#F0F2F8]">Broadcast Milestone</h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Achievement Preview Badge Card */}
            <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-[#181B26] border border-orange-200/80 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-500/30">
                  Level {level} · {tierMeta.label}
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {currentScore}% Score
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-[#F0F2F8] text-sm">{templateTitle}</h4>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Programming Language: <span className="text-orange-600 dark:text-orange-400 font-bold uppercase">{language}</span>
              </p>
            </div>

            {/* Target Course Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8B92A5]">Select Class Stream</label>
              {courses.length === 0 ? (
                <div className="text-xs text-slate-500 p-3 bg-slate-50 dark:bg-[#181B26] rounded-xl border border-slate-200 dark:border-white/5">
                  Loading courses or not currently enrolled in active courses.
                </div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-xl p-2.5 text-xs text-slate-800 dark:text-[#F0F2F8] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Custom note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8B92A5]">Add a note (optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Just solved this algorithmic challenge! Anyone want to compare solutions?"
                value={shareCustomNote}
                onChange={(e) => setShareCustomNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-xl p-2.5 text-xs text-slate-800 dark:text-[#F0F2F8] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {shareSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{shareSuccessMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcastMilestone}
                disabled={isSharing || courses.length === 0}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-xs cursor-pointer"
              >
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Post to Course Stream</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ──── Confetti Burst Overlay (CSS-only) ──── */}
      {showConfetti && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
        >
          <div className="text-center p-8 bg-slate-900/90 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/50 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-black text-white">Perfect Score!</h2>
            <p className="text-sm text-emerald-400 font-semibold mt-1">
              All public and hidden test cases passed.
            </p>
          </div>

          {/* 50 Confetti div particles */}
          {Array.from({ length: 50 }).map((_, i) => {
            const left = `${Math.random() * 100}%`;
            const animDuration = `${1.2 + Math.random() * 1.5}s`;
            const animDelay = `${Math.random() * 0.5}s`;
            const colors = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6"];
            const bg = colors[i % colors.length];
            const size = `${6 + Math.random() * 8}px`;

            return (
              <div
                key={i}
                className="absolute top-0 rounded-xs"
                style={{
                  left,
                  width: size,
                  height: size,
                  backgroundColor: bg,
                  animation: `confettiFall ${animDuration} linear ${animDelay} forwards`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ──── Topbar Navigation ──── */}
      <header className="flex-none flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#18181b] border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Link
            href={`/${institute}/activities/codelab`}
            className="group flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Problem Bank</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Problem title + level */}
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-orange-500" />
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[280px] sm:max-w-md">
              {templateTitle}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tierMeta.bg} ${tierMeta.border} ${tierMeta.color}`}
            >
              Level {level} · {tierMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
              isTimeLong
                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/20"
                : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Share Milestone Button */}
          <button
            onClick={openShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-xl border border-orange-200 dark:border-orange-500/30 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Share Result</span>
          </button>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-40 active:scale-95 cursor-pointer shadow-2xs"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-orange-500" />}
            <span>Run</span>
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmitAndEvaluate}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 active:scale-95 cursor-pointer"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit Solution</span>
          </button>
        </div>
      </header>

      {/* ──── 3-Panel Main Layout ──── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* ──── Left Panel: Problem Statement ──── */}
        <aside
          className="w-full md:w-[32%] min-w-[280px] bg-white dark:bg-[#18181b] border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-200"
          style={{ resize: "horizontal" }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#161b22]/80">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Problem Statement
              </span>
            </div>
            {tags.length > 0 && (
              <span className="text-[11px] font-mono text-slate-400">#{tags[0]}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* Rejection Alert Notice Card */}
            {rejectionWarning?.isRejected && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                    Previous Attempt Invalidated
                  </span>
                  <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/30">
                    Action Required
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed bg-white dark:bg-slate-950/70 p-3 rounded-xl border border-rose-100 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-slate-300">Instructor Note: </strong>
                  {rejectionWarning.rejectionReason || "Attempt invalidated by instructor."}
                </div>
              </div>
            )}

            {/* Parsed description markdown */}
            <div
              className="codelab-prose text-sm leading-relaxed text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: parsedDescription }}
            />

            {/* Hint Box */}
            {hintTemplate && (
              <div className="rounded-2xl border border-orange-200/80 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-2">
                <button
                  onClick={() => setShowHint((p) => !p)}
                  className="w-full flex items-center justify-between text-xs font-bold text-orange-700 dark:text-orange-300 hover:text-orange-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Algorithmic Hint {submissionCount >= 3 && "(Unlocked)"}</span>
                  </div>
                  {showHint ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showHint && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-2 border-t border-orange-200/60 dark:border-orange-500/20 animate-in fade-in duration-200">
                    {hintTemplate}
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ──── Center Panel: Monaco Editor ──── */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
          <CodeEditor />
        </main>

        {/* ──── Right Panel: Results & Telemetry ──── */}
        <aside
          className="w-full md:w-[32%] min-w-[280px] flex flex-col bg-white dark:bg-[#18181b] border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
          style={{ resize: "horizontal" }}
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
            <button
              onClick={() => setActiveTab("console")}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "console"
                  ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-500 bg-white dark:bg-[#18181b]"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Console
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "tests"
                  ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-500 bg-white dark:bg-[#18181b]"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Test Suite
              {totalTestsCount > 0 && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    totalPassedCount === totalTestsCount
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {totalPassedCount}/{totalTestsCount}
                </span>
              )}
            </button>
          </div>

          {/* Results Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {activeTab === "console" ? (
              <div className="space-y-4 font-mono">
                {!consoleOutput && !isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 font-sans">
                    <Terminal className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">Click &quot;Run&quot; to execute standard I/O against test input.</p>
                  </div>
                )}

                {isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 font-sans">
                    <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                    <span className="text-xs text-orange-600 font-medium">Executing inside Judge0 sandbox...</span>
                  </div>
                )}

                {consoleOutput && (
                  <div className="space-y-3 font-sans">
                    {/* Status line */}
                    <div
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border ${
                        consoleOutput.status.id === 3
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {consoleOutput.status.id === 3 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{consoleOutput.status.description}</span>
                      </div>
                      {consoleOutput.time && (
                        <span className="font-mono text-slate-400 text-[11px]">{consoleOutput.time}s</span>
                      )}
                    </div>

                    {/* Standard output */}
                    {consoleOutput.stdout && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Standard Output</div>
                        <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                          {consoleOutput.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Standard error */}
                    {consoleOutput.stderr && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-rose-600 uppercase">Standard Error</div>
                        <pre className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-700 dark:text-rose-300 font-mono text-xs border border-rose-200 dark:border-rose-900/30 whitespace-pre-wrap">
                          {consoleOutput.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Test Cases Tab */
              <div className="space-y-4 font-sans">
                {testResults.length === 0 && !isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                    <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">Click &quot;Submit Solution&quot; to evaluate against all test cases.</p>
                  </div>
                )}

                {isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                    <span className="text-xs text-orange-600 font-medium">Evaluating batch test suite...</span>
                  </div>
                )}

                {testResults.length > 0 && (
                  <div className="space-y-4">
                    {/* Score Bar */}
                    <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300">Test Suite Score</span>
                        <span className={currentScore === 100 ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-amber-600 dark:text-amber-400 font-black"}>
                          {currentScore}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-700 ease-out rounded-full"
                          style={{ width: `${currentScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Public test cases */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Public Test Cases
                      </div>
                      {testResults.map((res, i) => {
                        const tc = publicTestCases[i];
                        const isExpanded = expandedTests.has(i);

                        return (
                          <div
                            key={i}
                            className={`rounded-xl border transition-all ${
                              res.passed
                                ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/20"
                                : "bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/20"
                            }`}
                          >
                            <button
                              onClick={() => toggleTest(i)}
                              className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl"
                            >
                              <div className="flex items-center gap-2">
                                {res.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                )}
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  Case {i + 1}: {res.passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>

                            {isExpanded && tc && (
                              <div className="px-3 pb-3 space-y-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2 font-mono text-xs">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Input:</span>
                                  <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800">{tc.input}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Expected:</span>
                                  <div className="bg-slate-100 dark:bg-slate-950 p-2 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800">{tc.expectedOutput}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Actual Output:</span>
                                  <div className={`p-2 rounded-lg border ${res.passed ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-500/20" : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-500/20"}`}>
                                    {res.actualOutput || "—"}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hidden test cases */}
                    {hiddenResults.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Hidden Test Cases ({hiddenResults.length})
                        </div>
                        {hiddenResults.map((res, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
                              res.passed
                                ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-500/20 dark:text-emerald-300"
                                : "bg-rose-50/40 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {res.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              )}
                              <span>Hidden Test Case {i + 1}</span>
                            </div>
                            <span className="text-[11px] font-bold opacity-80">{res.passed ? "Pass" : "Fail"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ──── Bottom Activity Submit Bar ──── */}
      <footer className="flex-none">
        <SubmitBar
          activityType="codelab"
          assignmentId={assignmentId}
          studentId={studentId}
          variantSeed={variantSeed}
          startedAt={startedAt}
          maxScore={100}
        />
      </footer>
    </div>
  );
}

