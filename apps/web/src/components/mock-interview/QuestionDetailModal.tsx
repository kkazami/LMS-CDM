"use client";

import {
  X,
  Briefcase,
  Lightbulb,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { InterviewQuestionItem } from "@/lib/mock-interview/types";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionDetailModalProps {
  question: InterviewQuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (questionId: string) => void;
  onStartPractice: (question: InterviewQuestionItem) => void;
  theme: InstituteTheme;
}

export default function QuestionDetailModal({
  question,
  isOpen,
  onClose,
  isSaved,
  onToggleSave,
  onStartPractice,
  theme,
}: QuestionDetailModalProps) {
  if (!isOpen || !question) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-white/2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {question.category.replace(/_/g, " ")}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                {question.difficulty} Level
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Target: {question.jobPosition}
              </span>
            </div>
            <h2
              id="question-modal-title"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug pt-1"
            >
              {question.questionText}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Situation Context */}
          {question.situation && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-200">Context & Setting: </span>
                {question.situation}
              </div>
            </div>
          )}

          {/* Model Answer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Suggested Model Answer
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              <p className="whitespace-pre-line">{question.modelAnswer}</p>
            </div>
          </div>

          {/* Interview Tip */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Expert Interview Tip
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/30 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {question.interviewTip}
            </div>
          </div>

          {/* Evaluation Criteria */}
          {question.evaluationCriteria?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Evaluation Criteria & Rubric
                </h3>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {question.evaluationCriteria.map((criterion, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-white/3 border border-slate-200/70 dark:border-white/5 flex items-start gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Target Competency */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Core Professional Competency:
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              {question.competency}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-white/2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleSave(question.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isSaved
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Saved in Questions</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>Save Question</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice(question);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <span>Practice This Question</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
