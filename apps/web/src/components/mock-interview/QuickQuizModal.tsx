"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  Timer,
  Sparkles,
  HelpCircle,
  RotateCcw,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-white/2 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Quick Interview Quiz
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {questions.length} Questions &bull; 10 Pts Each
              </span>
            </div>
            <h2
              id="quiz-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5"
            >
              {submittedResult ? "Quiz Results & Review" : `Question ${currentIndex + 1} of ${questions.length}`}
            </h2>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        {!submittedResult && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
                backgroundColor: theme.colors.primary,
              }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {!submittedResult ? (
            /* Active Quiz Interface */
            <div className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="uppercase tracking-wider">{currentQ.category.replace(/_/g, " ")}</span>
                  <span>&bull;</span>
                  <span>{currentQ.difficulty}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.questionText}
                </h3>
              </div>

              {/* Choices */}
              <div className="space-y-2.5">
                {currentQ.choices.map((choice, idx) => {
                  const isSelected = selectedAnswers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAnswer(idx)}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-xs"
                          : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-relaxed pt-0.5">{choice}</span>
                    </button>
                  );
                })}
              </div>

              {/* Question Selector Quick-Dots */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Answered: {answeredCount} / {questions.length}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, idx) => {
                    const isAns = selectedAnswers[q.id] !== undefined;
                    const isCurr = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          isCurr
                            ? "ring-2 ring-amber-500 bg-amber-500 text-white"
                            : isAns
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isComplete || submitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <span>{submitting ? "Calculating Official Score..." : "Submit Quiz"}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Results & Review Mode */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Score Card */}
              <div className="p-6 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-700/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Official Quiz Results
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {submittedResult.score} / {submittedResult.maxScore} Pts
                    <span className="text-lg font-bold text-slate-500 dark:text-slate-400 ml-2">
                      ({submittedResult.percentage.toFixed(0)}%)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Correct Answers: {submittedResult.correctCount} of {submittedResult.totalQuestions}
                  </p>
                </div>
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Award className="w-8 h-8" />
                </div>
              </div>

              {/* Explanations & Review List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Question-by-Question Detailed Review & Explanations
                </h4>

                <div className="space-y-3">
                  {submittedResult.detailedResults.map((item, idx) => (
                    <div
                      key={item.questionId}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        item.isCorrect
                          ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/30"
                          : "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/30"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {item.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {idx + 1}. {item.questionText}
                          </span>
                          <div className="text-xs space-y-0.5">
                            <p className="text-slate-600 dark:text-slate-400">
                              <span className="font-semibold">Your selection: </span>
                              <span className={item.isCorrect ? "text-emerald-700 dark:text-emerald-300 font-bold" : "text-rose-700 dark:text-rose-300 line-through"}>
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

                      <div className="p-3 rounded-lg bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 pl-4 leading-relaxed">
                        <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                        {item.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close / Retake */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Done Reviewing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
