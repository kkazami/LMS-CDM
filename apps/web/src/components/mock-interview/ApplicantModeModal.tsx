"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Lightbulb,
  CheckSquare,
  Square,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Shuffle,
} from "lucide-react";
import type { InterviewQuestionItem, ApplicantSelfAssessmentChecklist } from "@/lib/mock-interview/types";
import type { InstituteTheme } from "@/lib/theme";

interface ApplicantModeModalProps {
  question: InterviewQuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAttempt: (data: {
    questionId: string;
    writtenAnswer: string;
    checklist: ApplicantSelfAssessmentChecklist;
    notes?: string;
  }) => Promise<void>;
  theme: InstituteTheme;
  onRandomizeQuestion?: () => void;
}

export default function ApplicantModeModal({
  question,
  isOpen,
  onClose,
  onSaveAttempt,
  theme,
  onRandomizeQuestion,
}: ApplicantModeModalProps) {
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(true);
  const [notes, setNotes] = useState("");

  const [checklist, setChecklist] = useState<ApplicantSelfAssessmentChecklist>({
    answersQuestion: false,
    includesExample: false,
    demonstratesCompetency: false,
    professionalLanguage: false,
    specificDetailed: false,
  });

  // Reset answer when question changes (e.g. on randomize)
  useEffect(() => {
    setWrittenAnswer("");
    setSubmitted(false);
    setSaving(false);
    setNotes("");
    setChecklist({
      answersQuestion: false,
      includesExample: false,
      demonstratesCompetency: false,
      professionalLanguage: false,
      specificDetailed: false,
    });
  }, [question?.id]);

  if (!isOpen || !question) return null;

  const wordCount = writtenAnswer.trim() ? writtenAnswer.trim().split(/\s+/).length : 0;

  const handleReset = () => {
    setWrittenAnswer("");
    setSubmitted(false);
    setSaving(false);
    setNotes("");
    setChecklist({
      answersQuestion: false,
      includesExample: false,
      demonstratesCompetency: false,
      professionalLanguage: false,
      specificDetailed: false,
    });
    onClose();
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writtenAnswer.trim()) return;
    setSubmitted(true);
  };

  const handleSaveAttempt = async () => {
    setSaving(true);
    try {
      await onSaveAttempt({
        questionId: question.id,
        writtenAnswer,
        checklist,
        notes,
      });
      handleReset();
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = (key: keyof ApplicantSelfAssessmentChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="applicant-mode-title"
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
                Applicant Mode Practice
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {question.jobPosition}
              </span>
            </div>
            <h2
              id="applicant-mode-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1"
            >
              {question.questionText}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRandomizeQuestion && !submitted && (
              <button
                type="button"
                onClick={onRandomizeQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/60 transition-colors cursor-pointer"
                title="Shuffle to another random interview question"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Randomize Question</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Situation Context */}
          {question.situation && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-700 dark:text-slate-200">Scenario Prompt: </span>
              {question.situation}
            </div>
          )}

          {!submitted ? (
            /* Stage 1: Writing Answer */
            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="applicant-answer-textarea"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Your Written Response:
                  </label>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {wordCount} words {wordCount < 40 && "(aim for 60-150 words)"}
                  </span>
                </div>
                <textarea
                  id="applicant-answer-textarea"
                  rows={8}
                  value={writtenAnswer}
                  onChange={(e) => setWrittenAnswer(e.target.value)}
                  placeholder="Structure your answer using Situation, Task, Action, and Result (STAR). What specific steps did you take, and what was the outcome?"
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0E1118] p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed resize-y"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div>
                  <span className="font-bold">Interview Advice: </span>
                  Focus on what YOU personally decided and implemented. After submitting, you will be
                  able to compare your response against the model answer and complete the self-assessment rubric.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!writtenAnswer.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Submit & Compare Answer
                </button>
              </div>
            </form>
          ) : (
            /* Stage 2: Self-Assessment and Model Comparison */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Written Answer Review */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Your Submitted Response ({wordCount} words)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit Response
                  </button>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {writtenAnswer}
                </p>
              </div>

              {/* Model Answer Toggle */}
              <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowModelAnswer(!showModelAnswer)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 hover:bg-amber-100/40 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Suggested Model Answer & Key Takeaways</span>
                  </div>
                  {showModelAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showModelAnswer && (
                  <div className="p-4 pt-1 space-y-3 text-sm text-slate-800 dark:text-slate-200 border-t border-amber-200/40 dark:border-amber-900/20">
                    <p className="whitespace-pre-line leading-relaxed">{question.modelAnswer}</p>
                    <div className="p-3 rounded-lg bg-white/70 dark:bg-white/5 border border-amber-200/50 dark:border-amber-900/20 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-amber-900 dark:text-amber-200">Coach Tip: </span>
                      {question.interviewTip}
                    </div>
                  </div>
                )}
              </div>

              {/* Self-Assessment Checklist */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Self-Assessment Checklist
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Critically reflect on your response against these five professional benchmarks.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        checkedCount === 5
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {checkedCount === 5 ? "100% Score (5/5 Met)" : `${checkedCount} / 5 Criteria Met`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {checkedCount === 5 ? "Unlocks category progress" : "100% required to gain progress"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    {
                      key: "answersQuestion" as const,
                      label: "Directly answered the core question without straying or evading",
                    },
                    {
                      key: "includesExample" as const,
                      label: "Included a concrete, practical example or academic project",
                    },
                    {
                      key: "demonstratesCompetency" as const,
                      label: `Clearly demonstrated ${question.competency}`,
                    },
                    {
                      key: "professionalLanguage" as const,
                      label: "Used clear, articulate, and professional workplace language",
                    },
                    {
                      key: "specificDetailed" as const,
                      label: "Sufficiently detailed and quantified results (actions and measurable outcomes)",
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleChecklist(item.key)}
                      className={`w-full p-3 rounded-lg border text-left text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                        checklist[item.key]
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                          : "bg-slate-50 dark:bg-white/3 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {checklist[item.key] ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Reflection Notes */}
              <div>
                <label
                  htmlFor="personal-notes-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Personal Practice Notes / Reminders (Optional):
                </label>
                <input
                  id="personal-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Next time remember to highlight specific inventory cost savings."
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0E1118] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Save Attempt Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttempt}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Attempt..." : "Save Attempt to My Progress"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
