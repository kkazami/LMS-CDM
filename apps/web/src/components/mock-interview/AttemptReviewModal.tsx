"use client";

import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  UserCheck,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

export interface StoredAttemptItem {
  id: string;
  type: "APPLICANT" | "RECRUITER" | "QUIZ";
  title: string;
  date: string;
  score?: number;
  maxScore?: number;
  details?: Record<string, any>;
}

interface AttemptReviewModalProps {
  attempt: StoredAttemptItem | null;
  isOpen: boolean;
  onClose: () => void;
  theme: InstituteTheme;
}

export default function AttemptReviewModal({
  attempt,
  isOpen,
  onClose,
  theme,
}: AttemptReviewModalProps) {
  if (!isOpen || !attempt) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attempt-review-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-white/2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {attempt.type === "APPLICANT"
                  ? "Applicant Mode Attempt"
                  : attempt.type === "RECRUITER"
                  ? "Recruiter Mode Attempt"
                  : "Quick Quiz Attempt"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {new Date(attempt.date).toLocaleString()}
              </span>
            </div>
            <h2
              id="attempt-review-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1"
            >
              {attempt.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs sm:text-sm">
          {attempt.score !== undefined && attempt.maxScore !== undefined && (
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Recorded Official Score
                </span>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {attempt.score} / {attempt.maxScore} Pts
                </p>
              </div>
              <Award className="w-6 h-6 text-amber-500" />
            </div>
          )}

          {/* APPLICANT ATTEMPT DETAILS */}
          {attempt.type === "APPLICANT" && attempt.details && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/10 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                  Your Written Answer:
                </span>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {attempt.details.writtenAnswer}
                </p>
              </div>

              {attempt.details.checklist && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                    Self-Assessment Checklist Completed:
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {Object.entries(attempt.details.checklist).map(([key, val]) => (
                      <li key={key} className="flex items-center gap-2">
                        {val ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={val ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-500"}>
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {attempt.details.notes && (
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">Personal Note: </span>
                  {attempt.details.notes}
                </div>
              )}
            </div>
          )}

          {/* RECRUITER ATTEMPT DETAILS */}
          {attempt.type === "RECRUITER" && attempt.details && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  {attempt.details.isQuestionCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Question Selection
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                  Selected Question ID: {attempt.details.selectedQuestionId}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  {attempt.details.isClassificationCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Answer Classification
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                  Classified as: <span className="font-semibold">{attempt.details.classifiedAnswer}</span>
                </p>
              </div>
            </div>
          )}

          {/* QUIZ ATTEMPT DETAILS */}
          {attempt.type === "QUIZ" && attempt.details && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500">Correct Answers:</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {attempt.details.correctAnswers} / {attempt.details.totalQuestions}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5">
                  <span className="text-slate-500">Percentage:</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {attempt.details.percentage?.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/10 flex justify-end bg-slate-50/70 dark:bg-white/2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
}
