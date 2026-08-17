"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { marked } from "marked";
import { CodeEditor } from "./CodeEditor";
import HTMLPreviewEditor from "./HTMLPreviewEditor";
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
import {
  ProblemLanguage,
  ExecutionMethod,
  STAGE_LABELS,
  LANGUAGE_LABELS,
} from "../problems/types";
import { runHtmlTests, runCssTests } from "../utils/html-css-runner";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Lightbulb,
  Sparkles,
  Loader2,
  Send,
  AlertOctagon,
  ArrowRight,
  Trophy,
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
  signature?: FuncSignature | null;
  publicTestCases: TestCase[];
  templateTitle?: string;
  level?: number;
  tags?: string[];
  hintTemplate?: string;
  hints?: string[];
  institute?: string;
  rejectionWarning?: RejectionWarningInfo | null;
  fixedLanguage?: ProblemLanguage;
  fixedLanguageId?: number;
  executionMethod?: ExecutionMethod;
  htmlTemplate?: string;
}

function statusIdToErrorType(statusId: number): string {
  if (statusId === 6) return "compile";
  if (statusId === 7 || statusId === 8) return "runtime";
  if (statusId === 5) return "tle";
  if (statusId === 4) return "assertion";
  if (statusId === 11) return "runtime";
  return "syntax";
}

export default function CodeLabScene({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
  descriptionMarkdown,
  signature = null,
  publicTestCases,
  templateTitle = "CodeLab Problem",
  level = 1,
  tags = [],
  hintTemplate = "",
  hints = [],
  institute = "ics",
  rejectionWarning = null,
  fixedLanguage = "python",
  fixedLanguageId = 71,
  executionMethod = "judge0",
  htmlTemplate = "",
}: CodeLabSceneProps) {
  const initialize = useCodeLabStore((s) => s.initialize);
  const updateCode = useCodeLabStore((s) => s.updateCode);
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
    hintWasShown,
    collectedErrorTypes,
    failedRunCount,
    firstRunTimestampMs,
    sessionStartMs,
    setHintShown,
    addErrorType,
    incrementFailedRun,
    recordFirstRun,
  } = useCodeLabStore();

  const {
    setScore,
    updateStateCheck,
    markComplete,
    elapsedSeconds,
    startTimer,
    resetActivity,
    score: currentScore,
  } = useActivityStore();

  const [mounted, setMounted] = useState<boolean>(false);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [hiddenResults, setHiddenResults] = useState<Array<{ passed: boolean; error?: string }>>([]);
  const [showRejectionWarning] = useState<boolean>(
    Boolean(rejectionWarning?.isRejected)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const [openHintIndex, setOpenHintIndex] = useState<number | null>(null);

  const progressiveHints: string[] = useMemo(() => {
    if (hints && hints.length > 0) return hints;
    if (hintTemplate) return [hintTemplate];
    return [];
  }, [hints, hintTemplate]);

  // Parse markdown description securely using marked
  const parsedDescription = useMemo(() => {
    try {
      return marked.parse(descriptionMarkdown) as string;
    } catch {
      return descriptionMarkdown;
    }
  }, [descriptionMarkdown]);

  useEffect(() => {
    resetActivity();
    initialize(fixedLanguage as CodeLabLanguage, signature, publicTestCases);
    startTimer();
  }, [assignmentId, level, fixedLanguage, signature, publicTestCases, resetActivity, initialize, startTimer]);

  // Format timer as MM:SS
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isTimeLong = elapsedSeconds > 30 * 60;

  // Stage stage label
  const stageName = level <= 10 ? "Basics" : level <= 20 ? "Building Up" : "Getting Good";

  // Toggle individual test case accordion
  const toggleTest = (index: number) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Client-side evaluation for HTML/CSS preview tracks */
  const handleHTMLCSSEvaluation = useCallback(async () => {
    if (isExecuting) return;
    setExecuting(true);
    setActiveTab("tests");
    incrementSubmission();

    const code = codeByLanguage[fixedLanguage as CodeLabLanguage] || "";
    let rawResults: Array<{ label: string; passed: boolean; error?: string }> = [];

    if (executionMethod === "html-preview") {
      rawResults = await runHtmlTests(
        code,
        publicTestCases.map((tc, idx) => ({
          label: `Test ${idx + 1}`,
          expectedOutputTemplate: tc.expectedOutput,
          isHidden: tc.isHidden,
        }))
      );
    } else {
      rawResults = await runCssTests(
        code,
        htmlTemplate,
        publicTestCases.map((tc, idx) => ({
          label: `Test ${idx + 1}`,
          expectedOutputTemplate: tc.expectedOutput,
          isHidden: tc.isHidden,
        }))
      );
    }

    const passedCount = rawResults.filter((r) => r.passed).length;
    const totalCount = rawResults.length;
    const computedScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    const mapped: TestCaseResult[] = rawResults.map((r) => ({
      passed: r.passed,
      actualOutput: r.passed ? "Element / Style matched in DOM" : null,
      error: r.error,
    }));

    setTestResults(mapped);
    setHiddenResults([]);
    setScore(computedScore);

    const cpm = elapsedSeconds > 0 ? Math.round((typedCharCount / elapsedSeconds) * 60) : 0;
    updateStateCheck("language", fixedLanguage);
    updateStateCheck("level", level);
    updateStateCheck("testPassCount", passedCount);
    updateStateCheck("totalTestCases", totalCount);
    updateStateCheck("typingVelocityCharsPerMin", cpm);
    updateStateCheck("pasteCount", pasteCount);

    if (computedScore >= 60) {
      markComplete(true);
      if (computedScore === 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
    } else {
      // Auto-reveal hint after first wrong attempt
      setShowHint(true);
    }

    setExecuting(false);
  }, [
    isExecuting,
    fixedLanguage,
    codeByLanguage,
    executionMethod,
    htmlTemplate,
    publicTestCases,
    level,
    elapsedSeconds,
    typedCharCount,
    pasteCount,
    setExecuting,
    setActiveTab,
    incrementSubmission,
    setTestResults,
    setScore,
    updateStateCheck,
    markComplete,
  ]);

  /** Run single test (Freeform execution with stdout/stderr via Judge0) */
  const handleRun = useCallback(async () => {
    if (isExecuting) return;

    if (executionMethod === "html-preview" || executionMethod === "css-preview") {
      await handleHTMLCSSEvaluation();
      return;
    }

    setExecuting(true);
    setActiveTab("console");
    setConsoleOutput(null);

    const code = codeByLanguage[fixedLanguage as CodeLabLanguage];
    const langId = fixedLanguageId || JUDGE0_LANGUAGE_IDS[fixedLanguage as CodeLabLanguage];

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
        throw new Error((errData as Record<string, string>).error || `HTTP ${res.status}`);
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
  }, [
    isExecuting,
    executionMethod,
    handleHTMLCSSEvaluation,
    codeByLanguage,
    fixedLanguage,
    fixedLanguageId,
    publicTestCases,
    setExecuting,
    setActiveTab,
    setConsoleOutput,
  ]);

  /** Full Evaluation (Runs against public + hidden test cases via /api/codelab/evaluate) */
  const handleSubmitAndEvaluate = useCallback(async () => {
    if (isExecuting) return;

    if (executionMethod === "html-preview" || executionMethod === "css-preview") {
      await handleHTMLCSSEvaluation();
      return;
    }

    setExecuting(true);
    setActiveTab("tests");
    incrementSubmission();

    const code = codeByLanguage[fixedLanguage as CodeLabLanguage];
    const langId = fixedLanguageId || JUDGE0_LANGUAGE_IDS[fixedLanguage as CodeLabLanguage];

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
        throw new Error((errData as Record<string, string>).error || `HTTP ${res.status}`);
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

      const mapped: TestCaseResult[] = data.publicResults.map((r) => ({
        passed: r.passed,
        actualOutput: r.actualOutput,
        error: r.error,
        time: r.time,
      }));

      setTestResults(mapped);
      setHiddenResults(data.hiddenResults);

      const cpm = elapsedSeconds > 0 ? Math.round((typedCharCount / elapsedSeconds) * 60) : 0;
      const firstRunDelta = firstRunTimestampMs ? firstRunTimestampMs - sessionStartMs : elapsedSeconds * 1000;

      setScore(data.score);
      updateStateCheck("language", fixedLanguage);
      updateStateCheck("level", level);
      updateStateCheck("pasteCount", pasteCount);
      updateStateCheck("typingVelocityCharsPerMin", cpm);
      updateStateCheck("testPassCount", data.totalPassed);
      updateStateCheck("totalTestCases", data.totalCases);
      updateStateCheck("hintUsed", hintWasShown || showHint);
      updateStateCheck("errorTypes", collectedErrorTypes.join(","));
      updateStateCheck("attemptChurnCount", failedRunCount);
      updateStateCheck("firstRunMs", Math.max(firstRunDelta, 0));
      updateStateCheck("totalEditingMs", elapsedSeconds * 1000);

      if (data.score >= 60) {
        markComplete(true);
        if (data.score === 100) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        }
      } else {
        incrementFailedRun();
        addErrorType("assertion");
        setHintShown();
        setShowHint(true);
      }
    } catch (err: unknown) {
      incrementFailedRun();
      addErrorType("runtime");
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
    executionMethod,
    handleHTMLCSSEvaluation,
    codeByLanguage,
    fixedLanguage,
    fixedLanguageId,
    assignmentId,
    variantSeed,
    level,
    pasteCount,
    typedCharCount,
    elapsedSeconds,
    hintWasShown,
    showHint,
    collectedErrorTypes,
    failedRunCount,
    firstRunTimestampMs,
    sessionStartMs,
    setHintShown,
    addErrorType,
    incrementFailedRun,
    recordFirstRun,
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

  const isPassed = currentScore >= 60 && testResults.length > 0;
  const nextLevel = level < 30 ? level + 1 : null;
  const langLabel = LANGUAGE_LABELS[fixedLanguage] || fixedLanguage;

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex-col select-none relative transition-colors duration-200">
      {/* ──── Academic Integrity / Rejection Warning Modal ──── */}
      {mounted && showRejectionWarning && rejectionWarning?.isRejected && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-rose-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 rounded-2xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Submission Invalidated
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  An instructor has requested a resubmission.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <strong>Reason: </strong>
              {rejectionWarning.rejectionReason || "Please solve and resubmit."}
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
              All test cases passed with 100%!
            </p>
          </div>

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
      <header className="flex-none flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#141721] border-b border-slate-200/80 dark:border-white/10 transition-colors">
        <div className="flex items-center gap-3">
          {/* Breadcrumb Navigation */}
          <Link
            href={`/${institute}/activities/codelab/${fixedLanguage}`}
            className="group flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-[#F0F2F8] bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2132] dark:hover:bg-[#25293C] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>{langLabel} Track</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:border-white/10" />

          {/* Problem title + level */}
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#F97316]" />
            <h1 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] truncate max-w-[280px] sm:max-w-md">
              Level {level}: {templateTitle}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400">
              {stageName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
              isTimeLong
                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/20"
                : "bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-[#1E2132] dark:text-[#F0F2F8] dark:border-white/10"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2132] dark:hover:bg-[#25293C] text-slate-800 dark:text-[#F0F2F8] text-xs font-bold rounded-xl border border-slate-200/80 dark:border-white/10 transition-all disabled:opacity-40 active:scale-95 cursor-pointer shadow-2xs"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-[#F97316]" />}
            <span>Run Tests</span>
          </button>

          {/* Submit button */}
          <button
            onClick={handleSubmitAndEvaluate}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F97316] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 active:scale-95 cursor-pointer"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit Solution</span>
          </button>
        </div>
      </header>

      {/* ──── Celebratory Level Pass Banner ──── */}
      {isPassed && (
        <div className="flex-none bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Trophy className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>
              🎉 Level {level} Passed! Score: {currentScore}% (≥ 60% Passing Threshold)
            </span>
          </div>

          {nextLevel ? (
            <Link
              href={`/${institute}/activities/codelab/${fixedLanguage}/${nextLevel}`}
              className="flex items-center gap-1.5 bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-1 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Go to Level {nextLevel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="text-xs font-bold bg-emerald-700/80 px-3 py-1 rounded-xl">
              Track Completed! 🏆
            </span>
          )}
        </div>
      )}

      {/* ──── Main Layout ──── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left Panel: W3Schools Educational Problem Statement */}
        <aside
          className="w-full md:w-[32%] min-w-[280px] max-w-full bg-white dark:bg-[#141721] border-r border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden text-slate-800 dark:text-[#F0F2F8]"
          style={{ resize: "horizontal" }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#181B26] min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] uppercase tracking-wider">
                Tutorial & Challenge
              </span>
            </div>
            {tags.length > 0 && (
              <span className="text-[11px] font-mono text-slate-400">#{tags[0]}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-6 min-w-0 max-w-full">
            {/* Parsed description markdown */}
            <div
              className="codelab-prose w-full max-w-full min-w-0 text-sm leading-relaxed text-slate-800 dark:text-slate-200 break-words [overflow-wrap:anywhere] [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:[overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-hidden [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:[overflow-wrap:anywhere]"
              dangerouslySetInnerHTML={{ __html: parsedDescription }}
            />

            {/* ──── Adaptive 3-Tier Progressive Hint System ──── */}
            {progressiveHints.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-[#F0F2F8] uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Adaptive Hints</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-[#8B92A5] font-bold">
                    {failedRunCount} failed attempt{failedRunCount === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Exploration State (0-2 failures) */}
                {failedRunCount < 3 && (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-4 text-xs text-slate-600 dark:text-[#8B92A5] space-y-2">
                    <p className="leading-relaxed font-medium">
                      💡 <strong>Try exploring first!</strong> If you run into errors or get stuck, progressive hints will automatically unlock to guide you:
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-[#8B92A5] pt-1">
                      <span>Hint 1 (Concept Direction):</span>
                      <span className="font-mono text-[#F97316] font-bold">{failedRunCount} / 3 attempts</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#F97316] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((failedRunCount / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Progressive Unlocked Tiers (Tier 1: >=3, Tier 2: >=5, Tier 3: >=7) */}
                {progressiveHints.map((hintText, tierIdx) => {
                  const requiredFails = tierIdx === 0 ? 3 : tierIdx === 1 ? 5 : 7;
                  const isUnlocked = failedRunCount >= requiredFails;
                  const isOpen = openHintIndex === tierIdx;

                  const tierNames = [
                    "Tier 1: Key Direction & Logic",
                    "Tier 2: Code Scaffold & Structure",
                    "Tier 3: Step-by-Step Breakdown",
                  ];

                  const tierBorder =
                    tierIdx === 0
                      ? "border-blue-300 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20"
                      : tierIdx === 1
                      ? "border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-purple-300 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20";

                  if (!isUnlocked) {
                    return (
                      <div
                        key={tierIdx}
                        className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400 dark:text-[#555C72] flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span>🔒</span>
                          <span>{tierNames[tierIdx] || `Tier ${tierIdx + 1} Hint`}</span>
                        </span>
                        <span className="font-mono text-[10px]">Unlocks at {requiredFails} attempts</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tierIdx}
                      className={`rounded-2xl border ${tierBorder} p-3.5 space-y-2 transition-all`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenHintIndex(isOpen ? null : tierIdx);
                          setHintShown();
                          updateStateCheck("hintUsed", true);
                        }}
                        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-[#F0F2F8] hover:text-[#F97316] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span>{tierIdx === 0 ? "💡" : tierIdx === 1 ? "🧱" : "🛠️"}</span>
                          <span>{tierNames[tierIdx] || `Tier ${tierIdx + 1} Hint`}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                            Unlocked
                          </span>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {isOpen && (
                        <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed pt-2.5 border-t border-slate-200/60 dark:border-white/10 animate-in fade-in duration-200">
                          <p className="font-medium whitespace-pre-wrap">{hintText}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Center / Preview Panel */}
        {executionMethod === "html-preview" || executionMethod === "css-preview" ? (
          <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#141721]">
            <HTMLPreviewEditor
              initialCode={codeByLanguage[fixedLanguage as CodeLabLanguage] || ""}
              language={fixedLanguage as "html" | "css"}
              htmlTemplate={htmlTemplate}
              onChange={(newCode) => updateCode(newCode)}
            />
          </main>
        ) : (
          <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#141721]">
            <CodeEditor />
          </main>
        )}

        {/* Right Panel: Test Suite & Results */}
        <aside
          className="w-full md:w-[30%] min-w-[260px] flex flex-col bg-white dark:bg-[#141721] border-l border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-[#F0F2F8]"
          style={{ resize: "horizontal" }}
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#181B26] flex-none">
            <button
              onClick={() => setActiveTab("console")}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "console"
                  ? "text-[#F97316] border-b-2 border-[#F97316] bg-white dark:bg-[#141721]"
                  : "text-slate-500 hover:text-slate-800 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Output
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "tests"
                  ? "text-[#F97316] border-b-2 border-[#F97316] bg-white dark:bg-[#141721]"
                  : "text-slate-500 hover:text-slate-800 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8]"
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

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {activeTab === "console" ? (
              <div className="space-y-4 font-mono">
                {!consoleOutput && !isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 font-sans">
                    <Terminal className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">Click &quot;Run Tests&quot; to execute your code.</p>
                  </div>
                )}
                {isExecuting && (
                  <div className="flex items-center justify-center h-48 gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <span>Executing in sandbox...</span>
                  </div>
                )}
                {consoleOutput && (
                  <div className="space-y-3">
                    {consoleOutput.stdout && (
                      <div className="p-4 bg-slate-900 dark:bg-[#10131C] border border-slate-800 dark:border-white/10 text-emerald-400 dark:text-emerald-300 rounded-2xl shadow-xs">
                        <div className="text-[11px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span>Standard Output</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs text-emerald-300 dark:text-emerald-300 leading-relaxed">{consoleOutput.stdout}</pre>
                      </div>
                    )}
                    {consoleOutput.stderr && (
                      <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-100 rounded-2xl shadow-xs">
                        <div className="text-[11px] text-rose-700 dark:text-rose-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                          <span>Standard Error</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs text-rose-800 dark:text-rose-200 leading-relaxed font-semibold">{consoleOutput.stderr}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.length === 0 && !isExecuting && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">No test results yet. Click &quot;Submit Solution&quot; to evaluate.</p>
                  </div>
                )}
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      result.passed
                        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/30"
                        : "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/30"
                    }`}
                  >
                    <div
                      onClick={() => toggleTest(idx)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Test Case #{idx + 1}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase">
                        {result.passed ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Passed</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">Failed</span>
                        )}
                      </span>
                    </div>

                    {expandedTests.has(idx) && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 font-mono">
                        {result.actualOutput && (
                          <div>
                            <span className="text-slate-400">Output: </span>
                            <span className="text-slate-800 dark:text-slate-200">{result.actualOutput}</span>
                          </div>
                        )}
                        {result.error && (
                          <div className="text-rose-500">
                            <span className="font-bold">Error: </span>
                            {result.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
