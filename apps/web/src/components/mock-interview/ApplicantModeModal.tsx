"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Loader2,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  Target,
  RotateCcw,
} from "lucide-react";
import type { InterviewQuestionItem, ApplicantSelfAssessmentChecklist } from "@/lib/mock-interview/types";
import {
  AI_DAILY_LIMIT,
  AI_MAX_CHARS,
  AI_MIN_WORDS,
  AI_PROGRESS_THRESHOLD,
  checklistFromEvaluation,
  type AiCriterionId,
  type AiEvaluateResponse,
  type MockInterviewAiEvaluation,
} from "@/lib/mock-interview/ai-types";
import type { InstituteTheme } from "@/lib/theme";

interface ApplicantModeModalProps {
  question: InterviewQuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAttempt: (result: {
    questionId: string;
    writtenAnswer: string;
    checklist: ApplicantSelfAssessmentChecklist;
    notes?: string;
    attemptId?: string;
    aiEvaluation?: MockInterviewAiEvaluation | null;
  }) => Promise<void>;
  theme: InstituteTheme;
  onRandomizeQuestion?: () => void;
  /** Server-decided: AI evaluation is switched on and a provider is configured. */
  aiEvaluationEnabled?: boolean;
  /** Initial remaining AI evaluations for today. */
  remainingAiToday?: number;
  /** Notifies parent hub when remaining AI quota changes. */
  onRemainingAiChange?: (remaining: number) => void;
  /** Opens the 36-Question Answer Guide modal starting at the given question. */
  onOpenAnswerGuide?: (question: InterviewQuestionItem) => void;
  /** Called after the server saved an AI-evaluated attempt, so the hub can update immediately. */
  onEvaluated?: (data: {
    attemptId: string;
    questionId: string;
    writtenAnswer: string;
    evaluation: MockInterviewAiEvaluation | null;
  }) => void;
}

const EMPTY_CHECKLIST: ApplicantSelfAssessmentChecklist = {
  answersQuestion: false,
  includesExample: false,
  demonstratesCompetency: false,
  professionalLanguage: false,
  specificDetailed: false,
};

const CRITERION_LABELS: Record<AiCriterionId, string> = {
  relevance: "Relevance",
  clarity: "Clarity & Structure",
  completeness: "Completeness",
  practicality: "Practical Evidence",
  communication: "Communication Tone",
};

function scoreTone(score: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (score >= 85) {
    return {
      bar: "bg-emerald-600",
      text: "text-emerald-700 dark:text-emerald-300",
      badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    };
  }
  if (score >= 70) {
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    };
  }
  if (score >= AI_PROGRESS_THRESHOLD) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
    };
  }
  return {
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50",
  };
}

function levelSegmentColor(level: number, segmentIndex: number): string {
  if (segmentIndex >= level) return "bg-slate-200 dark:bg-white/10";
  if (level >= 3) return "bg-emerald-500";
  if (level === 2) return "bg-amber-500";
  return "bg-rose-500";
}

export default function ApplicantModeModal({
  question,
  isOpen,
  onClose,
  theme,
  onRandomizeQuestion,
  aiEvaluationEnabled = false,
  remainingAiToday = AI_DAILY_LIMIT,
  onRemainingAiChange,
  onOpenAnswerGuide,
  onEvaluated,
}: ApplicantModeModalProps) {
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSubmittedAnswer, setShowSubmittedAnswer] = useState(false);
  const [copiedSentence, setCopiedSentence] = useState(false);
  const [notes, setNotes] = useState("");

  const [, setChecklist] = useState<ApplicantSelfAssessmentChecklist>({ ...EMPTY_CHECKLIST });

  // AI evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<MockInterviewAiEvaluation | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [evaluatedAnswer, setEvaluatedAnswer] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remainingToday, setRemainingToday] = useState<number>(remainingAiToday);

  useEffect(() => {
    setRemainingToday(remainingAiToday);
  }, [remainingAiToday]);

  const resetAi = () => {
    setEvaluating(false);
    setAiError(null);
    setAiNotice(null);
    setEvaluation(null);
    setPreviousScore(null);
    setEvaluatedAnswer(null);
    setAttemptId(null);
    setShowSubmittedAnswer(false);
    setCopiedSentence(false);
  };

  // Reset answer when question changes (e.g. on randomize)
  useEffect(() => {
    setWrittenAnswer("");
    setSubmitted(false);
    setNotes("");
    setChecklist({ ...EMPTY_CHECKLIST });
    resetAi();
  }, [question?.id]);

  if (!isOpen || !question) return null;

  const trimmedAnswer = writtenAnswer.trim();
  const wordCount = trimmedAnswer ? trimmedAnswer.split(/\s+/).length : 0;
  const charCount = writtenAnswer.length;
  const meetsAiMinimum = wordCount >= AI_MIN_WORDS && charCount <= AI_MAX_CHARS;
  const noAiAttemptsLeft = aiEvaluationEnabled && remainingToday <= 0;

  // An AI result applies only to the exact answer that was evaluated; editing unlocks a fresh run.
  const answerChangedSinceEval = evaluatedAnswer !== null && trimmedAnswer !== evaluatedAnswer;
  const activeEvaluation = answerChangedSinceEval ? null : evaluation;
  const activeAttemptId = answerChangedSinceEval ? null : attemptId;

  const handleReset = () => {
    setWrittenAnswer("");
    setSubmitted(false);
    setNotes("");
    setChecklist({ ...EMPTY_CHECKLIST });
    resetAi();
    onClose();
  };

  const handleEvaluate = async () => {
    if (!meetsAiMinimum || evaluating || noAiAttemptsLeft) return;
    setEvaluating(true);
    setAiError(null);
    setAiNotice(null);

    const priorScore = evaluation?.score ?? previousScore;

    try {
      const res = await fetch("/api/mock-interview/applicant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          questionId: question.id,
          writtenAnswer: trimmedAnswer,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (typeof data.remainingToday === "number") {
        setRemainingToday(data.remainingToday);
        onRemainingAiChange?.(data.remainingToday);
      }

      if (!res.ok) {
        if (data.code === "DAILY_LIMIT_EXCEEDED") {
          setRemainingToday(0);
          onRemainingAiChange?.(0);
        }
        setAiError(data.message || "Could not evaluate your answer right now. Please try again.");
        return;
      }

      const payload = data as AiEvaluateResponse;
      if (priorScore !== null && priorScore !== undefined && payload.evaluation) {
        setPreviousScore(priorScore);
      }
      setAttemptId(payload.attemptId);
      setEvaluatedAnswer(trimmedAnswer);
      setEvaluation(payload.evaluation);
      if (payload.evaluation) {
        setChecklist(checklistFromEvaluation(payload.evaluation));
      }
      if (payload.message) {
        setAiNotice(payload.message);
      } else if (payload.reused) {
        setAiNotice("Loaded your recent evaluation for this exact answer (did not use a daily credit).");
      }
      setSubmitted(true);
      onEvaluated?.({
        attemptId: payload.attemptId,
        questionId: question.id,
        writtenAnswer: trimmedAnswer,
        evaluation: payload.evaluation,
      });
    } catch {
      setAiError("Network error while contacting the AI coach. Check your connection and try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleCopySentence = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSentence(true);
      setTimeout(() => setCopiedSentence(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const quotaText = `${remainingToday} of ${AI_DAILY_LIMIT} AI evaluations left today`;
  const wordProgressPct = Math.min(100, Math.round((wordCount / 80) * 100));

  const outlineItems =
    (activeEvaluation?.answerOutline && activeEvaluation.answerOutline.length > 0
      ? activeEvaluation.answerOutline
      : evaluation?.answerOutline && evaluation.answerOutline.length > 0
        ? evaluation.answerOutline
        : question.evaluationCriteria.map((c, idx) => `Step ${idx + 1}: Address ${c.toLowerCase()}`)) ?? [];

  const scoreDelta =
    activeEvaluation && previousScore !== null ? activeEvaluation.score - previousScore : null;

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="applicant-mode-title"
    >
      <div className="relative w-full max-w-6xl max-h-[92dvh] sm:max-h-[94vh] flex flex-col rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Top Modal Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-white dark:bg-[#141721] shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
              Applicant Mode
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {question.jobPosition}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
              {question.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenAnswerGuide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAnswerGuide(question);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                title="Open Sample Answer Guide"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Sample Answer Guide</span>
              </button>
            )}
            {onRandomizeQuestion && (
              <button
                type="button"
                onClick={onRandomizeQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                title="Switch to another interview question"
              >
                <Shuffle className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Next Question</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Pane Split Content */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/10">
          {/* LEFT PANE: Question Context & Coach Tip */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50/60 dark:bg-[#10131B] space-y-5 lg:overflow-y-auto">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Interview Prompt &middot; {question.competency}
              </span>
              <h2
                id="applicant-mode-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
              >
                {question.questionText}
              </h2>
            </div>

            {question.situation && (
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                  Scenario Context
                </span>
                {question.situation}
              </div>
            )}

            {/* Pinned Revision Guidance when editing after a first evaluation */}
            {!submitted && evaluation && (
              <div className="p-4 rounded-lg bg-white dark:bg-[#141721] border border-amber-300 dark:border-amber-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                    <span>Revision Focus (Previous: {evaluation.score}/100)</span>
                  </span>
                </div>
                {(evaluation.nextStep || evaluation.recommendations[0]) && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">Priority fix: </span>
                    {evaluation.nextStep || evaluation.recommendations[0]}
                  </p>
                )}
                {outlineItems.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Suggested outline to follow:
                    </span>
                    <ol className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4">
                      {outlineItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* What Interviewers Look For */}
            {question.evaluationCriteria.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What interviewers look for
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {question.evaluationCriteria.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interviewer Tip */}
            {question.interviewTip && (
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Coach Tip</span>
                </div>
                <p className="leading-relaxed">{question.interviewTip}</p>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Answer Editor OR AI Evaluation Report */}
          <div className="lg:col-span-7 p-5 sm:p-6 bg-white dark:bg-[#141721] lg:overflow-y-auto">
            {!submitted || !activeEvaluation ? (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Banner when no AI evaluations remain today */}
                  {noAiAttemptsLeft && (
                    <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-amber-900 dark:text-amber-200 block">
                          0 AI evaluations remaining today
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          You have used all {AI_DAILY_LIMIT} AI evaluations for today. Open the Answer Guide to review predefined model answers and tips for all 36 questions.
                        </span>
                      </div>
                      {onOpenAnswerGuide && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAnswerGuide(question);
                          }}
                          className="px-3 py-1.5 rounded-lg font-semibold bg-white dark:bg-[#141721] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer"
                        >
                          Open Answer Guide
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="applicant-answer-textarea"
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Your Answer
                    </label>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {wordCount} words &middot; {charCount}/{AI_MAX_CHARS}
                    </span>
                  </div>

                  <textarea
                    id="applicant-answer-textarea"
                    rows={11}
                    value={writtenAnswer}
                    maxLength={AI_MAX_CHARS}
                    onChange={(e) => setWrittenAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.ctrlKey || e.metaKey) &&
                        e.key === "Enter" &&
                        aiEvaluationEnabled &&
                        !noAiAttemptsLeft &&
                        meetsAiMinimum &&
                        !evaluating
                      ) {
                        e.preventDefault();
                        handleEvaluate();
                      }
                    }}
                    placeholder="Write your response as you would say it in an interview. Include your context, the specific action you took, and the outcome..."
                    className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0E1118] p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 leading-relaxed resize-y"
                  />

                  {/* Word target progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          wordCount < AI_MIN_WORDS
                            ? "bg-slate-400"
                            : wordCount < 45
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${wordProgressPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {wordCount < AI_MIN_WORDS
                          ? `Write at least ${AI_MIN_WORDS} words (${AI_MIN_WORDS - wordCount} more needed).`
                          : wordCount < 45
                            ? "Good start — aim for 60–150 words for a complete interview answer."
                            : "Strong length for evaluation."}
                      </span>
                      {aiEvaluationEnabled && !noAiAttemptsLeft && (
                        <span className="hidden sm:inline text-slate-400">Ctrl + Enter to evaluate</span>
                      )}
                    </div>
                  </div>

                  {/* Evaluating skeleton state */}
                  {evaluating && (
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3 space-y-3 animate-pulse">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Evaluating your response across 5 interview criteria...</span>
                      </div>
                      <div className="h-2 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
                      <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
                    </div>
                  )}

                  {aiError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{aiError}</span>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-4 pb-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {quotaText}
                  </span>

                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={!meetsAiMinimum || evaluating || noAiAttemptsLeft}
                      aria-busy={evaluating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      {evaluating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{evaluating ? "Evaluating..." : "Evaluate with AI"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Stage 2: Structured Coaching Report */
              <div className="space-y-5 animate-in fade-in duration-200">
                {aiNotice && (
                  <div
                    role="status"
                    className="p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                    <span>{aiNotice}</span>
                  </div>
                )}

                {/* 1. Score & Verdict Header */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          AI Coaching Result
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${scoreTone(activeEvaluation.score).badge}`}
                        >
                          {activeEvaluation.rating}
                        </span>
                        {scoreDelta !== null && scoreDelta !== 0 && (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              scoreDelta > 0
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} vs last attempt
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {activeEvaluation.summary ||
                          (activeEvaluation.score >= AI_PROGRESS_THRESHOLD
                            ? "Your answer addresses the question and meets the passing benchmark."
                            : "Your response needs more structure and specific detail to pass an interview screen.")}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className={`text-3xl font-bold font-mono ${scoreTone(activeEvaluation.score).text}`}>
                          {activeEvaluation.score}
                        </span>
                        <span className="text-xs font-medium text-slate-400">/ 100</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {activeEvaluation.score >= AI_PROGRESS_THRESHOLD
                          ? `Meets ${AI_PROGRESS_THRESHOLD}+ standard`
                          : `Target: ${AI_PROGRESS_THRESHOLD}+ to pass`}
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={activeEvaluation.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="AI score"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${scoreTone(activeEvaluation.score).bar}`}
                      style={{ width: `${activeEvaluation.score}%` }}
                    />
                  </div>

                  {/* Collapsible Submitted Response */}
                  <div className="pt-1 border-t border-slate-200/70 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowSubmittedAnswer((prev) => !prev)}
                      className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer py-1"
                    >
                      <span className="font-medium">
                        {showSubmittedAnswer ? "Hide your submitted answer" : `View your submitted answer (${wordCount} words)`}
                      </span>
                      {showSubmittedAnswer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showSubmittedAnswer && (
                      <p className="mt-2 p-3 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {writtenAnswer}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. What the Question Is Really Asking & Priority Next Step */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>What the interviewer is testing</span>
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeEvaluation.questionInsight || question.interviewTip}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/15 space-y-1">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Your #1 next step</span>
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {activeEvaluation.nextStep || activeEvaluation.recommendations[0]}
                    </p>
                  </div>
                </div>

                {/* 3. Five-Criteria Rubric (0-4 segmented bars) */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Criteria Breakdown
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      3/4 or higher meets standard
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200/70 dark:divide-white/5">
                    {activeEvaluation.criteria.map((c) => {
                      const lvl = typeof c.level === "number" ? c.level : c.met ? 3 : 1;
                      return (
                        <div key={c.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              {c.met ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                {CRITERION_LABELS[c.id]}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 pl-5 leading-relaxed">
                              {c.reason}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pl-5 sm:pl-0 shrink-0">
                            <div className="flex items-center gap-1" aria-label={`${lvl} out of 4`}>
                              {[0, 1, 2, 3].map((seg) => (
                                <span
                                  key={seg}
                                  className={`w-4 h-1.5 rounded-xs ${levelSegmentColor(lvl, seg)}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 w-7 text-right">
                              {lvl}/4
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Answer Outline (Always shown) + Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Answer Outline */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#10131B] space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Recommended Answer Outline
                    </h4>
                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
                      {outlineItems.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Strengths & Actionable Improvements */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-3">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        What you did well
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                        {activeEvaluation.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                      <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        How to improve
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                        {activeEvaluation.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 5. Example Phrasing with Copy button */}
                {activeEvaluation.improvedSentence && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Example phrasing for your opening
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySentence(activeEvaluation.improvedSentence)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {copiedSentence ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic border-l-2 border-slate-300 dark:border-white/20 pl-3">
                      &ldquo;{activeEvaluation.improvedSentence}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Adapt this phrasing using your own real project or experience.
                    </p>
                  </div>
                )}

                {/* Results Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {activeAttemptId && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Saved automatically &middot; AI feedback is advisory</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revise Answer</span>
                    </button>

                    {onRandomizeQuestion && (
                      <button
                        type="button"
                        onClick={onRandomizeQuestion}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Next Question</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
