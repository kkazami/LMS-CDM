"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type { QuizQuestionItem } from "@/lib/mock-interview/types";
import type { InstituteTheme } from "@/lib/theme";

interface QuickQuizModalProps {
  questions: QuizQuestionItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuiz: (answers: Record<string, number>) => Promise<{
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    detailedResults: Array<{
      questionId: string;
      questionText: string;
      selectedChoice: number;
      correctChoice: number;
      isCorrect: boolean;
      explanation: string;
      choices: string[];
    }>;
  }>;
  theme: InstituteTheme;
}

export default function QuickQuizModal({
  questions,
  isOpen,
  onClose,
  onSubmitQuiz,
  theme,
}: QuickQuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "INCORRECT">("ALL");
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    detailedResults: Array<{
      questionId: string;
      questionText: string;
      selectedChoice: number;
      correctChoice: number;
      isCorrect: boolean;
      explanation: string;
      choices: string[];
    }>;
  } | null>(null);

  if (!isOpen || !questions || questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isComplete = answeredCount === questions.length;

  const handleSelectAnswer = (choiceIndex: number) => {
    if (submittedResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: choiceIndex,
    }));
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmitting(false);
    setReviewFilter("ALL");
    setSubmittedResult(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isComplete || submitting) return;
    setSubmitting(true);
    try {
      const result = await onSubmitQuiz(selectedAnswers);
      setSubmittedResult(result);
    } catch {
      // Handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviewItems = submittedResult
    ? submittedResult.detailedResults.filter((item) =>
        reviewFilter === "INCORRECT" ? !item.isCorrect : true
      )
    : [];

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92dvh] sm:max-h-[94vh] flex flex-col rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-white dark:bg-[#141721] shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
              Interview Readiness Quiz
            </span>
            <span className="text-slate-400">&bull;</span>
            <span id="quiz-modal-title" className="font-semibold text-slate-700 dark:text-slate-300">
              {submittedResult
                ? "Results & Answer Review"
                : `Question ${currentIndex + 1} of ${questions.length}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submittedResult ? (
          /* Two-pane Active Quiz */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/10">
            {/* LEFT PANE: Question Map */}
            <div className="lg:col-span-4 p-5 bg-slate-50/60 dark:bg-[#10131B] space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Question Navigator
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5">
                {questions.map((q, idx) => {
                  const isAns = selectedAnswers[q.id] !== undefined;
                  const isCurr = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-8 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                        isCurr
                          ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                          : isAns
                            ? "border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                            : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Topic &amp; Difficulty
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentQ.category.replace(/_/g, " ")} &middot; {currentQ.difficulty}
                </p>
              </div>
            </div>

            {/* RIGHT PANE: Current Question & Choices */}
            <div className="lg:col-span-8 p-5 sm:p-6 bg-white dark:bg-[#141721] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {currentQ.questionText}
                </h3>

                <div className="space-y-2.5">
                  {currentQ.choices.map((choice, idx) => {
                    const isSelected = selectedAnswers[currentQ.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectAnswer(idx)}
                        className={`w-full p-3.5 rounded-lg border text-left text-xs sm:text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 dark:bg-white/10 border-slate-900 dark:border-white text-slate-900 dark:text-white"
                            : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${
                            isSelected
                              ? "text-white"
                              : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                          }`}
                          style={isSelected ? { backgroundColor: theme.colors.primary } : undefined}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="leading-relaxed pt-0.5">{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < questions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isComplete || submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <span>{submitting ? "Scoring..." : `Submit Quiz (${answeredCount}/${questions.length})`}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Results View (No gradients) */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Quiz Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {submittedResult.score} / {submittedResult.maxScore} pts
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({submittedResult.percentage.toFixed(0)}% &middot; {submittedResult.correctCount}/{submittedResult.totalQuestions} correct)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#141721] p-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setReviewFilter("ALL")}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    reviewFilter === "ALL"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  All ({submittedResult.totalQuestions})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("INCORRECT")}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    reviewFilter === "INCORRECT"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Missed ({submittedResult.totalQuestions - submittedResult.correctCount})
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredReviewItems.map((item) => {
                const qNumber =
                  submittedResult.detailedResults.findIndex((r) => r.questionId === item.questionId) + 1;
                return (
                  <div
                    key={item.questionId}
                    className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 flex-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {qNumber}. {item.questionText}
                        </span>
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Your answer: </span>
                            <span
                              className={
                                item.isCorrect
                                  ? "text-emerald-700 dark:text-emerald-300 font-semibold"
                                  : "text-rose-700 dark:text-rose-300 line-through"
                              }
                            >
                              {item.choices[item.selectedChoice]}
                            </span>
                          </p>
                          {!item.isCorrect && (
                            <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Correct answer: {item.choices[item.correctChoice]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/3 border border-slate-200/70 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Explanation: </span>
                      {item.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-white/10">
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
        )}
      </div>
    </div>
  );
}
