"use client";

import {
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Target,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { AiCriterionId, MockInterviewAiEvaluation } from "@/lib/mock-interview/ai-types";

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

const CRITERION_LABELS: Record<AiCriterionId, string> = {
  relevance: "Relevance",
  clarity: "Clarity & Structure",
  completeness: "Completeness",
  practicality: "Practical Evidence",
  communication: "Communication Tone",
};

function levelSegmentColor(level: number, segmentIndex: number): string {
  if (segmentIndex >= level) return "bg-slate-200 dark:bg-white/10";
  if (level >= 3) return "bg-emerald-500";
  if (level === 2) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AttemptReviewModal({
  attempt,
  isOpen,
  onClose,
}: AttemptReviewModalProps) {
  if (!isOpen || !attempt) return null;

  const aiEval: MockInterviewAiEvaluation | null =
    attempt.type === "APPLICANT" && attempt.details?.aiEvaluation
      ? (attempt.details.aiEvaluation as MockInterviewAiEvaluation)
      : null;

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attempt-review-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[92vh] flex flex-col rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-4 bg-white dark:bg-[#141721]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {attempt.type === "APPLICANT"
                  ? "Applicant Practice"
                  : attempt.type === "RECRUITER"
                    ? "Recruiter Simulation"
                    : "Interview Quiz"}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-500 dark:text-slate-400">
                {new Date(attempt.date).toLocaleString()}
              </span>
            </div>
            <h2
              id="attempt-review-title"
              className="text-base font-bold text-slate-900 dark:text-white leading-snug"
            >
              {attempt.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs sm:text-sm">
          {attempt.score !== undefined && attempt.maxScore !== undefined && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Recorded Score
                </span>
                <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {attempt.score} / {attempt.maxScore} pts
                </p>
              </div>
            </div>
          )}

          {/* APPLICANT ATTEMPT DETAILS */}
          {attempt.type === "APPLICANT" && attempt.details && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 space-y-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs block">
                  Your Written Response
                </span>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {attempt.details.writtenAnswer}
                </p>
              </div>

              {aiEval && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        AI Coach Evaluation (Advisory)
                      </span>
                      {aiEval.summary && (
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {aiEval.summary}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                        {aiEval.score}
                      </span>
                      <span className="text-xs text-slate-400"> / 100</span>
                      <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {aiEval.rating}
                      </span>
                    </div>
                  </div>

                  {(aiEval.questionInsight || aiEval.nextStep) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiEval.questionInsight && (
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#10131B] space-y-1 text-xs">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>What this question tests</span>
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            {aiEval.questionInsight}
                          </p>
                        </div>
                      )}
                      {aiEval.nextStep && (
                        <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/15 space-y-1 text-xs">
                          <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            <span>Priority next step</span>
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            {aiEval.nextStep}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {Array.isArray(aiEval.criteria) && aiEval.criteria.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200/70 dark:divide-white/5 overflow-hidden">
                      {aiEval.criteria.map((c) => {
                        const lvl = typeof c.level === "number" ? c.level : c.met ? 3 : 1;
                        return (
                          <div key={c.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {CRITERION_LABELS[c.id] ?? c.id}
                              </span>
                              <p className="text-slate-600 dark:text-slate-400">{c.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1">
                                {[0, 1, 2, 3].map((seg) => (
                                  <span
                                    key={seg}
                                    className={`w-3.5 h-1.5 rounded-xs ${levelSegmentColor(lvl, seg)}`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300 w-6 text-right">
                                {lvl}/4
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Array.isArray(aiEval.answerOutline) && aiEval.answerOutline.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#10131B] space-y-1.5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Recommended Answer Outline
                      </span>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        {aiEval.answerOutline.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {Array.isArray(aiEval.recommendations) && aiEval.recommendations.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Actionable Recommendations
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        {aiEval.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!aiEval && attempt.details.checklist && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs block">
                    Self-Assessment Checklist
                  </span>
                  <ul className="space-y-1.5 text-xs">
                    {Object.entries(attempt.details.checklist).map(([key, val]) => (
                      <li key={key} className="flex items-center gap-2">
                        {val ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={val ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-500"}>
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* RECRUITER ATTEMPT DETAILS */}
          {attempt.type === "RECRUITER" && attempt.details && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  1. Question Selection
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  {attempt.details.isQuestionCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">Needs Review</span>
                    </>
                  )}
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  2. Answer Classification ({attempt.details.classifiedAnswer})
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  {attempt.details.isClassificationCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">Needs Review</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* QUIZ ATTEMPT DETAILS */}
          {attempt.type === "QUIZ" && attempt.details && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10">
                <span className="text-slate-500">Correct Answers</span>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {attempt.details.correctAnswers} / {attempt.details.totalQuestions}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10">
                <span className="text-slate-500">Accuracy</span>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  {attempt.details.percentage?.toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end bg-white dark:bg-[#141721]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
