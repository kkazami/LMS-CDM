"use client";

import { useState, useEffect } from "react";
import {
  X,
  Lightbulb,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import type { InterviewQuestionItem } from "@/lib/mock-interview/types";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionDetailModalProps {
  question: InterviewQuestionItem | null;
  allQuestions?: InterviewQuestionItem[];
  onSelectQuestion?: (question: InterviewQuestionItem) => void;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (questionId: string) => void;
  onStartPractice: (question: InterviewQuestionItem) => void;
  theme: InstituteTheme;
}

export default function QuestionDetailModal({
  question,
  allQuestions = [],
  onSelectQuestion,
  isOpen,
  onClose,
  isSaved,
  onToggleSave,
  onStartPractice,
  theme,
}: QuestionDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const currentIndex =
    question && allQuestions.length > 0
      ? allQuestions.findIndex((q) => q.id === question.id)
      : -1;
  const totalCount = allQuestions.length;

  useEffect(() => {
    setCopied(false);
  }, [question?.id]);

  // Keyboard Left / Right arrow navigation across the 36 questions
  useEffect(() => {
    if (!isOpen || !onSelectQuestion || allQuestions.length <= 1 || currentIndex === -1) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        const prevIdx = (currentIndex - 1 + allQuestions.length) % allQuestions.length;
        onSelectQuestion(allQuestions[prevIdx]);
      } else if (e.key === "ArrowRight") {
        const nextIdx = (currentIndex + 1) % allQuestions.length;
        onSelectQuestion(allQuestions[nextIdx]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onSelectQuestion, allQuestions, currentIndex]);

  if (!isOpen || !question) return null;

  const handlePrev = () => {
    if (!onSelectQuestion || allQuestions.length === 0 || currentIndex === -1) return;
    const prevIdx = (currentIndex - 1 + allQuestions.length) % allQuestions.length;
    onSelectQuestion(allQuestions[prevIdx]);
  };

  const handleNext = () => {
    if (!onSelectQuestion || allQuestions.length === 0 || currentIndex === -1) return;
    const nextIdx = (currentIndex + 1) % allQuestions.length;
    onSelectQuestion(allQuestions[nextIdx]);
  };

  const handleCopyModelAnswer = async () => {
    try {
      await navigator.clipboard.writeText(question.modelAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92dvh] sm:max-h-[94vh] flex flex-col rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Top Bar with 36-Question Switcher & Prev/Next */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#10131B] shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Sample Answer Guide{" "}
                {currentIndex !== -1 && totalCount > 0
                  ? `(${currentIndex + 1} of ${totalCount})`
                  : ""}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {allQuestions.length > 1 && onSelectQuestion && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#141721] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                  title="Previous question (Left Arrow)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#141721] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                  title="Next question (Right Arrow)"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Question Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] space-y-1.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {question.category.replace(/_/g, " ")}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Role: {question.jobPosition}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 dark:text-slate-400">
              {question.difficulty} &middot; {question.competency}
            </span>
          </div>
          <h2
            id="question-modal-title"
            className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
          >
            {question.questionText}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {question.situation && (
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                Scenario Context
              </span>
              {question.situation}
            </div>
          )}

          {/* Predefined Model Answer */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 bg-white dark:bg-[#141721]">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Predefined Model Answer (How to Answer)
              </span>
              <button
                type="button"
                onClick={handleCopyModelAnswer}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Reference</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
              {question.modelAnswer}
            </div>
          </div>

          {/* Interview Tip & What Interviewers Look For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#10131B] border border-slate-200 dark:border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>How to Approach This Question</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {question.interviewTip}
              </p>
            </div>

            {question.evaluationCriteria?.length > 0 && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#10131B] border border-slate-200 dark:border-white/10 space-y-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Key Points Your Answer Should Cover
                </span>
                <ul className="space-y-1.5 text-xs">
                  {question.evaluationCriteria.map((criterion, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#141721] shrink-0">
          <button
            type="button"
            onClick={() => onToggleSave(question.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isSaved
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                <span>Save Question</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
