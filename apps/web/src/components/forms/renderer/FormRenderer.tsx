"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Send,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import TimerBar from "./TimerBar";
import ProgressBar from "./ProgressBar";
import QuestionRenderer from "./QuestionRenderer";
import IntegrityFeedbackToast, {
  type IntegrityToastData,
} from "@/components/courses/IntegrityFeedbackToast";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { evaluateQuestionVisibility } from "@/lib/forms/conditional-logic";
import type { FormData, FormQuestionData, FormAttemptData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface FormRendererProps {
  form: FormData;
  attempt: FormAttemptData;
  courseId: string;
  instituteCode: string;
  studentName: string;
  studentEmail: string;
  theme: InstituteTheme;
  isPreview?: boolean;
  canRetake?: boolean;
}

type AnswerRecord = {
  answerText?: string | null;
  answerOptions?: string[] | null;
  answerNumber?: number | null;
  answerDate?: string | Date | null;
  answerRanking?: string[] | null;
  answerMatrix?: Record<string, string> | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
};

export default function FormRenderer({
  form,
  attempt,
  courseId,
  instituteCode,
  studentName,
  studentEmail,
  theme,
  isPreview = false,
  canRetake = false,
}: FormRendererProps) {
  const router = useRouter();

  // Initialize answers map from attempt.answers
  const initialAnswers = useMemo(() => {
    const map: Record<string, AnswerRecord> = {};
    if (attempt.answers) {
      attempt.answers.forEach((ans) => {
        map[ans.questionId] = {
          answerText: ans.answerText,
          answerOptions: ans.answerOptions,
          answerNumber: ans.answerNumber,
          answerDate: ans.answerDate,
          answerRanking: ans.answerRanking,
          answerMatrix: ans.answerMatrix,
          fileUrl: ans.fileUrl,
          fileName: ans.fileName,
          fileSizeBytes: ans.fileSizeBytes,
        };
      });
    }
    return map;
  }, [attempt.answers]);

  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>(initialAnswers);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score?: number | null;
    totalPoints?: number | null;
    percentage?: number | null;
    passed?: boolean | null;
    confirmationMessage?: string;
  } | null>(
    ["SUBMITTED", "TIMED_OUT"].includes(attempt.status)
      ? {
          score: attempt.rawScore,
          totalPoints: attempt.totalPoints,
          percentage: attempt.percentage,
          passed: attempt.passed,
          confirmationMessage:
            form.confirmationMessage || "Your response has been submitted.",
        }
      : null
  );

  // Anti-cheat, tab-switch and security state
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(
    attempt.tabSwitchCount || 0
  );
  const [copyPasteCount, setCopyPasteCount] = useState<number>(
    attempt.copyPasteCount || 0
  );
  const [showTabSwitchModal, setShowTabSwitchModal] = useState(false);
  const [isObscured, setIsObscured] = useState(false);
  const [toast, setToast] = useState<IntegrityToastData | null>(null);

  const isAwayRef = useRef<boolean>(false);
  const blurTimeRef = useRef<number | null>(null);
  const tabSwitchCountRef = useRef<number>(attempt.tabSwitchCount || 0);
  const copyPasteCountRef = useRef<number>(attempt.copyPasteCount || 0);
  const lastLoggedRef = useRef<Record<string, number>>({});

  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const triggerToast = useCallback(
    (message: string, eventType: IntegrityToastData["eventType"]) => {
      setToast({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        message,
        eventType,
      });
    },
    []
  );

  // Sync integrity action to backend
  const logIntegrityAction = useCallback(
    async (
      action: "TAB_SWITCH" | "COPY_PASTE" | "RIGHT_CLICK",
      metadata: Record<string, unknown> = {}
    ) => {
      if (isPreview) return;

      const now = Date.now();
      const last = lastLoggedRef.current[action] || 0;
      if (now - last < 500) return;
      lastLoggedRef.current[action] = now;

      // 1. Patch FormAttempt record with live counts
      try {
        fetch(
          `/api/courses/${courseId}/forms/${form.id}/attempts/${attempt.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              tabSwitchCount: tabSwitchCountRef.current,
              copyPasteCount: copyPasteCountRef.current,
            }),
            keepalive: true,
          }
        ).catch(() => {});
      } catch {}

      // 2. Log to system integrity event table
      try {
        const payload = {
          syllabusItemId: form.syllabusItemId || undefined,
          eventType: action,
          severity: action === "TAB_SWITCH" ? "MEDIUM" : action === "COPY_PASTE" ? "HIGH" : "LOW",
          metadata,
        };
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon("/api/integrity/events", blob);
        } else {
          fetch("/api/integrity/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
    },
    [courseId, form.id, form.syllabusItemId, attempt.id, isPreview]
  );

  // Autosave hook
  const { save, flush, isSaving, lastSavedAt, saveError } = useFormAutosave(
    courseId,
    form.id,
    attempt.id
  );

  // Submit attempt handler
  const handleAutoSubmit = useCallback(async () => {
    if (isPreview || attempt.status !== "IN_PROGRESS") return;
    setIsSubmitting(true);
    try {
      await flush().catch(() => {});
      const res = await fetch(
        `/api/courses/${courseId}/forms/${form.id}/attempts/${attempt.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabSwitchCount: tabSwitchCountRef.current,
            copyPasteCount: copyPasteCountRef.current,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to submit. Please try again.");
      if (res.ok) {
        setSubmissionResult(data);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, form.id, attempt.id, attempt.status, isPreview, flush]);

  // Exam timer
  const secondsLeft = useExamTimer(attempt.deadlineAt, handleAutoSubmit);

  // Security and Proctoring Event Listeners (Anti-copy, Anti-screenshot, Tab-switch, Anti-right-click)
  useEffect(() => {
    if (isPreview || submissionResult) return;

    // 1. Right Click Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerToast("Right-click is disabled to protect assessment integrity.", "RIGHT_CLICK");
      logIntegrityAction("RIGHT_CLICK");
    };

    // 2. Copy & Cut Prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteCountRef.current += 1;
      setCopyPasteCount(copyPasteCountRef.current);
      triggerToast("Copying questions or text is strictly disabled.", "COPY_PASTE");
      logIntegrityAction("COPY_PASTE", { action: "copy" });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteCountRef.current += 1;
      setCopyPasteCount(copyPasteCountRef.current);
      triggerToast("Cutting text is disabled during assessments.", "COPY_PASTE");
      logIntegrityAction("COPY_PASTE", { action: "cut" });
    };

    // 3. Selection & Drag Prevention outside input fields
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return; // Allow selecting text inside answer input
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // 4. Keyboard Shortcuts: Screenshots, DevTools, Print, Copy
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen Key
      if (e.key === "PrintScreen") {
        e.preventDefault();
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        triggerToast("Screenshots are strictly prohibited.", "COPY_PASTE");
        setIsObscured(true);
        setTimeout(() => setIsObscured(false), 1600);
        logIntegrityAction("COPY_PASTE", { action: "print_screen" });
        return;
      }

      // Snipping tool / Screenshot shortcuts: Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+Shift+S
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ["s", "S", "3", "4", "5"].includes(e.key)
      ) {
        e.preventDefault();
        setIsObscured(true);
        setTimeout(() => setIsObscured(false), 1600);
        triggerToast("Screen capture shortcuts are blocked.", "COPY_PASTE");
        logIntegrityAction("COPY_PASTE", { action: "shortcut_screenshot" });
        return;
      }

      // Print: Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        triggerToast("Printing this assessment is disabled.", "COPY_PASTE");
        return;
      }

      // Developer Tools: F12, Ctrl+Shift+I/J/C, Cmd+Option+I
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ["i", "I", "j", "J", "c", "C"].includes(e.key))
      ) {
        e.preventDefault();
        triggerToast("Developer tools are disabled during assessments.", "INFO");
        return;
      }

      // Block Ctrl+C / Cmd+C outside of user inputs
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (
        !isInput &&
        (e.ctrlKey || e.metaKey) &&
        ["c", "C", "x", "X", "u", "U"].includes(e.key)
      ) {
        e.preventDefault();
        triggerToast("Copying questions is disabled.", "COPY_PASTE");
        return;
      }
    };

    // 5. Bulletproof Tab Switch & Window Departure Detection
    const handleDeparture = () => {
      if (isAwayRef.current) return;
      isAwayRef.current = true;
      blurTimeRef.current = Date.now();
    };

    const handleArrival = () => {
      if (!isAwayRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      isAwayRef.current = false;
      const departureTime = blurTimeRef.current || Date.now();
      const awayDuration = Math.max(1, Math.round((Date.now() - departureTime) / 1000));
      blurTimeRef.current = null;

      tabSwitchCountRef.current += 1;
      const newCount = tabSwitchCountRef.current;
      setTabSwitchCount(newCount);
      setShowTabSwitchModal(true);
      triggerToast("Tab switch detected — this incident has been logged.", "TAB_SWITCH");
      logIntegrityAction("TAB_SWITCH", { durationSeconds: awayDuration, tabSwitchCount: newCount });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleDeparture();
      } else {
        handleArrival();
      }
    };

    const handleWindowBlur = () => {
      handleDeparture();
    };

    const handleWindowFocus = () => {
      handleArrival();
    };

    // Attach listeners
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCut);
    window.addEventListener("selectstart", handleSelectStart);
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("selectstart", handleSelectStart);
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isPreview, submissionResult, triggerToast, logIntegrityAction]);

  // Questions with dynamic branching evaluation
  const allQuestions = form.questions || [];
  const evaluatedQuestions = evaluateQuestionVisibility(allQuestions, answers);
  const visibleQuestions = evaluatedQuestions.filter((q) => q.isVisible);

  // Organize by sections / pages
  const sections =
    form.sections && form.sections.length > 0
      ? form.sections
      : [
          {
            id: "sec_1",
            formId: form.id,
            pageNumber: 1,
            title: null,
            description: null,
            position: 0,
          },
        ];

  const totalPages = Math.max(1, ...sections.map((s) => s.pageNumber));

  // Questions for the current page
  const pageQuestions = visibleQuestions.filter((q) => {
    if (totalPages === 1) return true;
    if (!q.sectionId) return currentPage === 1;
    const sec = sections.find((s) => s.id === q.sectionId);
    return (sec?.pageNumber ?? 1) === currentPage;
  });

  // Handle student answer change
  const handleAnswerChange = (
    questionId: string,
    updates: Partial<AnswerRecord>
  ) => {
    const nextAnswers = {
      ...answers,
      [questionId]: {
        ...answers[questionId],
        ...updates,
      },
    };
    setAnswers(nextAnswers);

    if (errors[questionId]) {
      setErrors((prev) => ({ ...prev, [questionId]: false }));
    }

    save({
      questionId,
      ...nextAnswers[questionId],
    });
  };

  // Page navigation validation
  const validateCurrentPage = () => {
    const newErrors: Record<string, boolean> = {};
    let hasInvalid = false;

    pageQuestions.forEach((q) => {
      if (!q.isRequired || q.questionType === "SECTION_HEADER") return;

      const ans = answers[q.id];
      const hasText = ans?.answerText && ans.answerText.trim().length > 0;
      const hasOptions = ans?.answerOptions && ans.answerOptions.length > 0;
      const hasNumber =
        ans?.answerNumber !== null && ans?.answerNumber !== undefined;
      const hasDate = Boolean(ans?.answerDate);
      const hasFile = Boolean(ans?.fileUrl);
      const hasMatrix =
        ans?.answerMatrix && Object.keys(ans.answerMatrix).length > 0;
      const hasRanking = ans?.answerRanking && ans.answerRanking.length > 0;

      const isAnswered =
        hasText ||
        hasOptions ||
        hasNumber ||
        hasDate ||
        hasFile ||
        hasMatrix ||
        hasRanking;
      if (!isAnswered) {
        newErrors[q.id] = true;
        hasInvalid = true;
      }
    });

    setErrors(newErrors);

    if (hasInvalid) {
      const firstErrorId = Object.keys(newErrors)[0];
      const el = document.getElementById(`question-${firstErrorId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }

    return true;
  };

  const handleNextPage = () => {
    if (validateCurrentPage()) {
      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateCurrentPage()) return;
    if (isPreview) { setSubmissionResult({ confirmationMessage: "Preview complete. No response was submitted." }); return; }

    setIsSubmitting(true);
    try {
      await flush();
      const res = await fetch(
        `/api/courses/${courseId}/forms/${form.id}/attempts/${attempt.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabSwitchCount: tabSwitchCountRef.current,
            copyPasteCount: copyPasteCountRef.current,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to submit. Please try again.");
      if (res.ok) {
        setSubmissionResult(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completed submission view
  if (submissionResult) {
    return (
      <div className="w-full pt-1 pb-16 px-4 flex justify-center items-start">
        <div className="max-w-md w-full bg-white dark:bg-[#12151E] rounded-3xl shadow-lg border border-slate-200/90 dark:border-white/10 overflow-hidden text-center p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {form.title}
            </h1>
            <p className="text-xs text-slate-600 dark:text-[#8B92A5] leading-relaxed">
              {submissionResult.confirmationMessage ||
                "Your response has been recorded successfully."}
            </p>
          </div>

          {/* Assessment Score Card: Number format mainly (e.g. 1/2) with percentage as small text */}
          {form.showScoreAfter &&
            submissionResult.percentage !== null &&
            submissionResult.percentage !== undefined && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1.5">
                <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Your Score
                </div>

                {/* Primary Score in number format like 1 / 2 */}
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {submissionResult.score ?? 0} / {submissionResult.totalPoints ?? 0}
                </div>

                {/* Secondary small text showing percentage */}
                <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {submissionResult.percentage ?? 0}%
                </div>

                {submissionResult.passed !== null && (
                  <div className="pt-1">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        submissionResult.passed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {submissionResult.passed ? "PASSED" : "NEEDS REVIEW"}
                    </span>
                  </div>
                )}
              </div>
            )}

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {isPreview && (
              <Link
                href={`/${instituteCode}/courses/${courseId}/classwork/forms/${form.id}/builder`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
              >
                Back to Builder
              </Link>
            )}
            {canRetake && !isPreview && (
              <Link
                href={`/${instituteCode}/courses/${courseId}/classwork/forms/${form.id}/respond?retake=true`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Retake Assessment
              </Link>
            )}
            <Link
              href={`/${instituteCode}/courses/${courseId}/classwork`}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-opacity ${
                canRetake && !isPreview
                  ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15"
                  : "text-white shadow-xs hover:opacity-90"
              }`}
              style={!canRetake || isPreview ? { backgroundColor: primaryColor } : undefined}
            >
              Return to Classwork
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] pb-24 select-none">
      {/* Global CSS Print & Selection Protection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          body:after {
            content: "Printing or exporting this assessment is strictly prohibited.";
            visibility: visible !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            font-weight: 800;
            color: #ef4444;
          }
        }
        .form-question-card {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        .form-question-card input,
        .form-question-card textarea {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `}</style>

      {/* Screen Obscuring Flash if screenshot shortcut is pressed */}
      {isObscured && (
        <div className="fixed inset-0 z-100 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in">
          <div className="space-y-3">
            <ShieldAlert className="w-14 h-14 text-rose-500 mx-auto" />
            <h2 className="text-xl font-black text-white">Screen Capture Prohibited</h2>
            <p className="text-xs text-slate-400">
              Assessment content is protected. All screen capture attempts are recorded.
            </p>
          </div>
        </div>
      )}

      {/* Prominent Tab Switch Warning Modal */}
      {showTabSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-[#121624] rounded-3xl border border-amber-500/40 p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Tab Switch Detected!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed">
                You have navigated away from the assessment window. Leaving or switching
                tabs during this examination is strictly monitored and recorded on your exam record.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  Total tab departures recorded: <strong>{tabSwitchCount}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTabSwitchModal(false)}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              I Understand, Return to Assessment
            </button>
          </div>
        </div>
      )}

      {/* Sticky exam countdown timer with tab departures indicator */}
      <TimerBar secondsLeft={secondsLeft} tabSwitches={tabSwitchCount} />

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Google Forms Top Card */}
        <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden">
          <div
            className="h-3 w-full"
            style={{ backgroundColor: form.themeColor || primaryColor }}
          />

          <div className="p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {form.title}
              </h1>
              {form.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed pt-1">
                  {form.description}
                </p>
              )}
            </div>

            {/* Student ID Banner (Google Forms style) */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#8B92A5]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {studentEmail}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500">
                  {studentName}
                </span>
              </div>
              <span className="text-rose-500 text-[11px] font-semibold">* Required</span>
            </div>
          </div>
        </div>

        {/* Multi-page progress bar */}
        <ProgressBar currentStep={currentPage} totalSteps={totalPages} theme={theme} />

        {/* Current page questions list */}
        <div className="space-y-4 form-question-card">
          {pageQuestions.map((q, idx) => (
            <QuestionRenderer
              key={q.id}
              question={q}
              index={idx}
              value={answers[q.id] || {}}
              onChange={(updates) => handleAnswerChange(q.id, updates)}
              hasError={Boolean(errors[q.id])}
              theme={theme}
            />
          ))}
        </div>

        {/* Bottom Pagination & Submit Bar */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <div>
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={handlePrevPage}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                {submitError || saveError || (isSaving ? "Saving..." : lastSavedAt ? "Draft saved" : "")}
              </span>
            )}
          </div>

          <div>
            {currentPage < totalPages ? (
              <button
                type="button"
                onClick={handleNextPage}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Real-time Integrity Notification Toast */}
      <IntegrityFeedbackToast
        toast={toast}
        onDismiss={() => setToast(null)}
        isMonitoringActive={!isPreview}
      />
    </div>
  );
}
