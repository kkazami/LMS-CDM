"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Save,
  Check,
  File,
  Download,
} from "lucide-react";
import type { FormAttemptAnswerData, FormQuestionData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionWithAnswer extends FormQuestionData {
  answer: FormAttemptAnswerData | null;
}

interface ResponseDetailProps {
  attempt: {
    id: string;
    formId: string;
    attemptNumber: number;
    status: string;
    rawScore: number | null;
    totalPoints: number | null;
    percentage: number | null;
    passed: boolean | null;
    startedAt: string | Date;
    submittedAt: string | Date | null;
    timeSpentSecs: number | null;
    tabSwitchCount: number;
    copyPasteCount: number;
    user: {
      id: string;
      name: string;
      email: string;
      studentNumber?: string | null;
    };
    questionsWithAnswers: QuestionWithAnswer[];
  };
  courseId: string;
  formId: string;
  instituteCode: string;
  theme?: InstituteTheme;
}

export default function ResponseDetail({
  attempt,
  courseId,
  formId,
  instituteCode,
  theme,
}: ResponseDetailProps) {
  const [manualGrades, setManualGrades] = useState<
    Record<string, { points: number; feedback: string; isSaved?: boolean }>
  >(() => {
    const map: Record<string, { points: number; feedback: string }> = {};
    attempt.questionsWithAnswers.forEach((q) => {
      if (q.answer) {
        map[q.answer.id] = {
          points: q.answer.pointsAwarded ?? 0,
          feedback: q.answer.feedback ?? "",
        };
      }
    });
    return map;
  });

  const [isSavingMap, setIsSavingMap] = useState<Record<string, boolean>>({});
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleSaveManualGrade = async (answerId: string) => {
    const grade = manualGrades[answerId];
    if (!grade) return;

    setIsSavingMap((prev) => ({ ...prev, [answerId]: true }));
    try {
      const res = await fetch(
        `/api/courses/${courseId}/forms/${formId}/responses/${attempt.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answerId,
            pointsAwarded: grade.points,
            feedback: grade.feedback,
          }),
        }
      );

      if (res.ok) {
        setManualGrades((prev) => ({
          ...prev,
          [answerId]: { ...prev[answerId], isSaved: true },
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMap((prev) => ({ ...prev, [answerId]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/responses`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Responses</span>
        </Link>
      </div>

      {/* Student Attempt Summary Card */}
      <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {attempt.user.name}
            </h2>
            <p className="text-xs text-slate-500">
              {attempt.user.studentNumber ? `${attempt.user.studentNumber} • ` : ""}
              {attempt.user.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {attempt.rawScore ?? 0} / {attempt.totalPoints ?? 0}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {attempt.percentage ?? 0}%
              </div>
            </div>

            {attempt.passed !== null && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  attempt.passed
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {attempt.passed ? "PASSED" : "FAILED"}
              </span>
            )}
          </div>
        </div>

        {/* Anti-cheat summary metrics */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Time taken: {attempt.timeSpentSecs ? `${Math.round(attempt.timeSpentSecs / 60)} mins` : "N/A"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Tab switches: <strong>{attempt.tabSwitchCount}</strong> | Copy/Pastes: <strong>{attempt.copyPasteCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Questions and Answers Review List */}
      <div className="space-y-4">
        {attempt.questionsWithAnswers.map((q, idx) => {
          if (q.questionType === "SECTION_HEADER") {
            return (
              <div key={q.id} className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-bold text-slate-800 dark:text-white">
                {q.prompt}
              </div>
            );
          }

          const ans = q.answer;
          const isGradableManually = ["PARAGRAPH", "CODE_ANSWER", "FILE_UPLOAD"].includes(q.questionType);
          const currentGrade = ans ? manualGrades[ans.id] : null;

          return (
            <div
              key={q.id}
              className={`rounded-2xl bg-white dark:bg-[#12151E] border p-6 space-y-3 transition-colors ${
                ans?.isCorrect === true
                  ? "border-emerald-500/30 dark:border-emerald-500/20"
                  : ans?.isCorrect === false
                  ? "border-rose-500/30 dark:border-rose-500/20"
                  : "border-slate-200/80 dark:border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Question {idx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {q.prompt}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {ans?.isCorrect === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {ans?.isCorrect === false && <XCircle className="w-4 h-4 text-rose-500" />}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {ans?.pointsAwarded ?? 0} / {q.points} pts
                  </span>
                </div>
              </div>

              {/* Student's Answer Value */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Student Response:
                </div>
                {ans?.answerText ? (
                  <div className="font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {ans.answerText}
                  </div>
                ) : ans?.answerOptions && ans.answerOptions.length > 0 ? (
                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                    {ans.answerOptions.map((optId) => {
                      const match = q.config?.options?.find((o) => o.id === optId);
                      return match ? match.text : optId;
                    }).join(", ")}
                  </div>
                ) : ans?.answerNumber !== null && ans?.answerNumber !== undefined ? (
                  <div className="text-slate-800 dark:text-slate-200 font-bold">
                    {ans.answerNumber}
                  </div>
                ) : ans?.fileUrl ? (
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-primary" />
                    <a
                      href={ans.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {ans.fileName || "View Uploaded File"}
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No answer provided</div>
                )}
              </div>

              {/* Manual Grading Override Drawer */}
              {isGradableManually && ans && currentGrade && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Score (out of {q.points}):
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={q.points}
                      step={0.5}
                      value={currentGrade.points}
                      onChange={(e) =>
                        setManualGrades((prev) => ({
                          ...prev,
                          [ans.id]: {
                            ...prev[ans.id],
                            points: Number(e.target.value) || 0,
                            isSaved: false,
                          },
                        }))
                      }
                      className="w-16 py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center font-bold"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Add instructor feedback..."
                      value={currentGrade.feedback}
                      onChange={(e) =>
                        setManualGrades((prev) => ({
                          ...prev,
                          [ans.id]: {
                            ...prev[ans.id],
                            feedback: e.target.value,
                            isSaved: false,
                          },
                        }))
                      }
                      className="w-full py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveManualGrade(ans.id)}
                    disabled={isSavingMap[ans.id]}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSavingMap[ans.id] ? (
                      "Saving..."
                    ) : currentGrade.isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Update Grade</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
