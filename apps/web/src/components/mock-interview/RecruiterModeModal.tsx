"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
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

type Step = "SELECT_QUESTION" | "EVALUATE_ANSWER" | "RESULT";

const CLASSIFICATION_LABELS: Record<
  AnswerClassification,
  { label: string; desc: string }
> = {
  STRONG: {
    label: "Strong Response",
    desc: "Structured, specific, and demonstrates strong professional competency and accountability.",
  },
  ACCEPTABLE: {
    label: "Acceptable Response",
    desc: "Addresses the core prompt adequately but lacks concrete metrics or deeper initiative.",
  },
  WEAK_INCOMPLETE: {
    label: "Weak / Incomplete Response",
    desc: "Vague, avoids the main challenge, or provides no evidence of practical execution.",
  },
  IRRELEVANT_INAPPROPRIATE: {
    label: "Irrelevant / Inappropriate Response",
    desc: "Misses the subject, violates workplace standards, or shows unprofessional conduct.",
  },
};

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
  const [submitting, setSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    maxScore: number;
    isQuestionCorrect: boolean;
    isClassificationCorrect: boolean;
    isFollowUpCorrect?: boolean;
    advice: string;
  } | null>(null);

  useEffect(() => {
    setCurrentStep("SELECT_QUESTION");
    setSelectedQuestionId("");
    setSelectedClassification("");
    setEvaluationResult(null);
    setSubmitting(false);
  }, [scenario?.id]);

  if (!isOpen || !scenario) return null;

  const handleReset = () => {
    setCurrentStep("SELECT_QUESTION");
    setSelectedQuestionId("");
    setSelectedClassification("");
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

  const finalizeAttempt = async () => {
    if (!selectedClassification) return;
    setSubmitting(true);
    try {
      const res = await onSubmitAttempt({
        scenarioId: scenario.id,
        selectedQuestionId,
        classifiedAnswer: selectedClassification as AnswerClassification,
      });
      setEvaluationResult(res);
      setCurrentStep("RESULT");
    } catch {
      // Handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Array<{ key: Step; label: string }> = [
    { key: "SELECT_QUESTION", label: "1. Choose Question" },
    { key: "EVALUATE_ANSWER", label: "2. Classify Answer" },
    { key: "RESULT", label: "3. Debrief" },
  ];

  const activeStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruiter-mode-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92dvh] sm:max-h-[94vh] flex flex-col rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 bg-white dark:bg-[#141721] shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md font-semibold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
              Recruiter Simulation
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {scenario.roleOrPosition}
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

        {/* Two-Pane Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/10">
          {/* LEFT PANE: Scenario Brief & Step Progress */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50/60 dark:bg-[#10131B] space-y-5 lg:overflow-y-auto">
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Hiring Scenario
              </span>
              <h2
                id="recruiter-mode-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
              >
                {scenario.title}
              </h2>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5">
              <span className="font-semibold text-slate-900 dark:text-white block">
                Workplace Context
              </span>
              <p>{scenario.context}</p>
            </div>

            {/* Step Tracker */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Simulation Progress
              </span>
              <div className="space-y-1.5">
                {steps.map((st, idx) => {
                  const isCurrent = idx === activeStepIndex;
                  const isDone = idx < activeStepIndex;
                  return (
                    <div
                      key={st.key}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
                        isCurrent
                          ? "bg-white dark:bg-[#141721] border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold"
                          : isDone
                            ? "bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                            : "border-transparent text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      <span>{st.label}</span>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedQuestionObj && currentStep !== "SELECT_QUESTION" && (
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 text-xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Question You Asked
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedQuestionObj.text}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Active Decision Step */}
          <div className="lg:col-span-7 p-5 sm:p-6 bg-white dark:bg-[#141721] lg:overflow-y-auto">
            {/* STEP 1: Select Question */}
            {currentStep === "SELECT_QUESTION" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 1: Choose the Most Diagnostic Interview Question
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select the question that best tests whether the candidate will handle this situation ethically and effectively.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {scenario.questionOptions.map((opt, idx) => {
                    const isSelected = selectedQuestionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedQuestionId(opt.id)}
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
                        <span className="leading-relaxed pt-0.5">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleNextFromQuestion}
                    disabled={!selectedQuestionId}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <span>Hear Candidate Response</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Evaluate Applicant Answer */}
            {currentStep === "EVALUATE_ANSWER" && (
              <div className="space-y-4">
                {applicantAnswerObj && (
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Candidate&apos;s Response</span>
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                      &ldquo;{applicantAnswerObj.answerText}&rdquo;
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Step 2: Classify the Candidate&apos;s Answer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    How would you rate the quality and professionalism of this response?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      "STRONG",
                      "ACCEPTABLE",
                      "WEAK_INCOMPLETE",
                      "IRRELEVANT_INAPPROPRIATE",
                    ] as AnswerClassification[]
                  ).map((cls) => {
                    const info = CLASSIFICATION_LABELS[cls];
                    const isSelected = selectedClassification === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSelectedClassification(cls)}
                        className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 dark:bg-white/10 border-slate-900 dark:border-white"
                            : "bg-white dark:bg-white/2 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {info.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2
                              className="w-4 h-4 shrink-0"
                              style={{ color: theme.colors.primary }}
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {info.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStep("SELECT_QUESTION")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={finalizeAttempt}
                    disabled={!selectedClassification || submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <span>{submitting ? "Scoring..." : "Complete Simulation"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Debrief & Results (No gradients) */}
            {currentStep === "RESULT" && evaluationResult && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Recruiter Simulation Score
                    </span>
                    <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {evaluationResult.score} <span className="text-sm font-sans font-normal text-slate-400">/ {evaluationResult.maxScore} pts</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Saved to your practice history.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                      evaluationResult.score >= 70
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
                    }`}
                  >
                    {evaluationResult.score >= 70 ? "Strong Calibration" : "Review Decisions"}
                  </span>
                </div>

                {/* Decision Breakdown */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/10 overflow-hidden">
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {evaluationResult.isQuestionCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span>1. Interview Question Selection</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {evaluationResult.isQuestionCorrect ? "+50 pts" : "0 pts"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                      {selectedQuestionObj?.explanation}
                    </p>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {evaluationResult.isClassificationCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span>2. Candidate Answer Classification</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {evaluationResult.isClassificationCorrect ? "+50 pts" : "0 pts"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                      Expected classification: <strong className="text-slate-800 dark:text-slate-200">{applicantAnswerObj?.classification}</strong> &mdash; {applicantAnswerObj?.explanation}
                    </p>
                  </div>
                </div>

                {/* Practical Recruiter Advice */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] space-y-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Recruiter Takeaway</span>
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {scenario.practicalAdvice}
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
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
      </div>
    </div>
  );
}
