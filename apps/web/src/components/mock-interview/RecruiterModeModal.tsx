"use client";

import { useState } from "react";
import {
  X,
  UserCheck,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Award,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type {
  RecruiterScenarioItem,
  AnswerClassification,
} from "@/lib/mock-interview/types";
import type { InstituteTheme } from "@/lib/theme";

interface RecruiterModeModalProps {
  scenario: RecruiterScenarioItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitAttempt: (result: {
    scenarioId: string;
    selectedQuestionId: string;
    classifiedAnswer: AnswerClassification;
    selectedFollowUpId?: string;
  }) => Promise<{
    score: number;
    maxScore: number;
    isQuestionCorrect: boolean;
    isClassificationCorrect: boolean;
    isFollowUpCorrect?: boolean;
    advice: string;
  }>;
  theme: InstituteTheme;
}

type Step = "SELECT_QUESTION" | "EVALUATE_ANSWER" | "SELECT_FOLLOWUP" | "RESULT";

export default function RecruiterModeModal({
  scenario,
  isOpen,
  onClose,
  onSubmitAttempt,
  theme,
}: RecruiterModeModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("SELECT_QUESTION");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [selectedClassification, setSelectedClassification] =
    useState<AnswerClassification | "">("");
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    maxScore: number;
    isQuestionCorrect: boolean;
    isClassificationCorrect: boolean;
    isFollowUpCorrect?: boolean;
    advice: string;
  } | null>(null);

  if (!isOpen || !scenario) return null;

  const handleReset = () => {
    setCurrentStep("SELECT_QUESTION");
    setSelectedQuestionId("");
    setSelectedClassification("");
    setSelectedFollowUpId("");
    setEvaluationResult(null);
    setSubmitting(false);
    onClose();
  };

  const selectedQuestionObj = scenario.questionOptions.find(
    (q) => q.id === selectedQuestionId
  );
  const applicantAnswerObj = selectedQuestionId
    ? scenario.applicantAnswers[selectedQuestionId]
    : null;

  const handleNextFromQuestion = () => {
    if (!selectedQuestionId) return;
    setCurrentStep("EVALUATE_ANSWER");
  };

  const handleNextFromAnswer = () => {
    if (!selectedClassification) return;
    if (scenario.followUpOptions && scenario.followUpOptions.length > 0) {
      setCurrentStep("SELECT_FOLLOWUP");
    } else {
      finalizeAttempt();
    }
  };

  const finalizeAttempt = async () => {
    setSubmitting(true);
    try {
      const res = await onSubmitAttempt({
        scenarioId: scenario.id,
        selectedQuestionId,
        classifiedAnswer: selectedClassification as AnswerClassification,
        selectedFollowUpId: selectedFollowUpId || undefined,
      });
      setEvaluationResult(res);
      setCurrentStep("RESULT");
    } catch {
      // Handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const classificationLabels: Record<
    AnswerClassification,
    { label: string; desc: string; color: string }
  > = {
    STRONG: {
      label: "Strong Response",
      desc: "Comprehensive, structured, and demonstrates exemplary competency and professional accountability.",
      color: "emerald",
    },
    ACCEPTABLE: {
      label: "Acceptable Response",
      desc: "Answers the prompt adequately but lacks deeper depth, specific metrics, or proactive initiative.",
      color: "blue",
    },
    WEAK_INCOMPLETE: {
      label: "Weak / Incomplete Response",
      desc: "Superficial, avoids the core challenge, or lacks relevant evidence of practical execution.",
      color: "amber",
    },
    IRRELEVANT_INAPPROPRIATE: {
      label: "Irrelevant / Inappropriate Response",
      desc: "Violates professional norms, misses the subject entirely, or displays unethical or combative behavior.",
      color: "rose",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruiter-mode-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-white/2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Recruiter Mode Simulation
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {scenario.roleOrPosition}
              </span>
            </div>
            <h2
              id="recruiter-mode-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1"
            >
              {scenario.title}
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

        {/* Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-white/3 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span
              className={
                currentStep === "SELECT_QUESTION"
                  ? "font-bold text-slate-900 dark:text-white"
                  : ""
              }
            >
              1. Choose Question
            </span>
            <span>&rarr;</span>
            <span
              className={
                currentStep === "EVALUATE_ANSWER"
                  ? "font-bold text-slate-900 dark:text-white"
                  : ""
              }
            >
              2. Classify Answer
            </span>
            <span>&rarr;</span>
            <span
              className={
                currentStep === "SELECT_FOLLOWUP"
                  ? "font-bold text-slate-900 dark:text-white"
                  : ""
              }
            >
              3. Follow-up
            </span>
            <span>&rarr;</span>
            <span
              className={
                currentStep === "RESULT"
                  ? "font-bold text-slate-900 dark:text-white"
                  : ""
              }
            >
              4. Debrief
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Scenario Context (Always Visible) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span>Workplace Hiring Scenario</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {scenario.context}
            </p>
          </div>

          {/* STEP 1: Select Question */}
          {currentStep === "SELECT_QUESTION" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 1: Select the Most Diagnostic Interview Question
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Which question best evaluates whether the candidate will handle this scenario ethically and effectively?
                </p>
              </div>

              <div className="space-y-2.5">
                {scenario.questionOptions.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedQuestionId(opt.id)}
                    className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                      selectedQuestionId === opt.id
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-xs"
                        : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        selectedQuestionId === opt.id
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed pt-0.5">{opt.text}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextFromQuestion}
                  disabled={!selectedQuestionId}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span>Hear Candidate's Response</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Evaluate Applicant Answer */}
          {currentStep === "EVALUATE_ANSWER" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/4 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold">You asked: </span>
                {selectedQuestionObj?.text}
              </div>

              {applicantAnswerObj ? (
                <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Candidate Answered:</span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                    &ldquo;{applicantAnswerObj.answerText}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="p-4 text-xs text-slate-500">
                  (Prepared answer for this question)
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 2: Classify the Candidate's Answer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  As an interviewer, how would you evaluate the quality and professionalism of this response?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    "STRONG",
                    "ACCEPTABLE",
                    "WEAK_INCOMPLETE",
                    "IRRELEVANT_INAPPROPRIATE",
                  ] as AnswerClassification[]
                ).map((cls) => {
                  const info = classificationLabels[cls];
                  const isSelected = selectedClassification === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClassification(cls)}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-xs"
                          : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {info.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {info.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep("SELECT_QUESTION")}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  &larr; Back to Question
                </button>
                <button
                  type="button"
                  onClick={handleNextFromAnswer}
                  disabled={!selectedClassification}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Follow-up Question */}
          {currentStep === "SELECT_FOLLOWUP" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 3: Choose an Effective Follow-up Question
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the follow-up inquiry that best clarifies the candidate's depth and verifies compliance.
                </p>
              </div>

              <div className="space-y-2.5">
                {scenario.followUpOptions.map((fu, idx) => (
                  <button
                    key={fu.id}
                    type="button"
                    onClick={() => setSelectedFollowUpId(fu.id)}
                    className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                      selectedFollowUpId === fu.id
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-xs"
                        : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        selectedFollowUpId === fu.id
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed pt-0.5">{fu.text}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep("EVALUATE_ANSWER")}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  &larr; Back to Classification
                </button>
                <button
                  type="button"
                  onClick={finalizeAttempt}
                  disabled={!selectedFollowUpId || submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span>{submitting ? "Scoring Attempt..." : "Finalize Evaluation"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Debrief & Results */}
          {currentStep === "RESULT" && evaluationResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Score Banner */}
              <div className="p-5 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-700/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Recruiter Evaluation Result
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    {evaluationResult.score} / {evaluationResult.maxScore} Points Earned
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Attempt saved to your student practice history.
                  </p>
                </div>
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Award className="w-7 h-7" />
                </div>
              </div>

              {/* Assessment Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Decision Breakdown & Key Takeaways
                </h4>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-2">
                  <div className="flex items-center gap-2">
                    {evaluationResult.isQuestionCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      1. Interview Question Selection ({evaluationResult.isQuestionCorrect ? "+35 pts" : "+0 pts"})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                    {selectedQuestionObj?.explanation}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-2">
                  <div className="flex items-center gap-2">
                    {evaluationResult.isClassificationCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      2. Answer Classification ({evaluationResult.isClassificationCorrect ? "+35 pts" : "+0 pts"})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                    Official evaluation: {applicantAnswerObj?.classification} &mdash;{" "}
                    {applicantAnswerObj?.explanation}
                  </p>
                </div>

                {scenario.followUpOptions?.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-2">
                    <div className="flex items-center gap-2">
                      {evaluationResult.isFollowUpCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        3. Follow-up Probe ({evaluationResult.isFollowUpCorrect ? "+30 pts" : "+0 pts"})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                      {scenario.followUpOptions.find((f) => f.id === selectedFollowUpId)?.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Recruitment Advice */}
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Practical Recruiter Advice</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {scenario.practicalAdvice}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Done Practicing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
