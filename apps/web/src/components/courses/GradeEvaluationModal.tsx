"use client";

import { useState, useTransition } from "react";
import { X, Star, CheckCircle2, FileText, Link2, Send } from "lucide-react";
import { returnGrade } from "@/app/(dashboard)/[institute]/courses/[courseId]/classwork/[itemId]/actions";

interface SubmissionAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

interface Submission {
  id: string;
  status: string;
  grade: number | null;
  isReturned: boolean;
  submittedAt: Date | null;
  student: { id: string; name: string; email: string };
  attachments: SubmissionAttachment[];
}

interface GradeEvaluationModalProps {
  submission: Submission;
  maxPoints: number | null;
  instituteCode: string;
  courseId: string;
  itemId: string;
  onClose: () => void;
  onGraded: (submissionId: string, grade: number) => void;
}

export default function GradeEvaluationModal({
  submission,
  maxPoints,
  instituteCode,
  courseId,
  itemId,
  onClose,
  onGraded,
}: GradeEvaluationModalProps) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleReturn() {
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0) {
      setError("Enter a valid grade.");
      return;
    }
    if (maxPoints && gradeNum > maxPoints) {
      setError(`Grade cannot exceed ${maxPoints} points.`);
      return;
    }

    startTransition(async () => {
      const result = await returnGrade(
        submission.id,
        gradeNum,
        undefined,
        instituteCode,
        courseId,
        itemId
      );
      if (!result.success) {
        setError(result.error ?? "Failed to return grade.");
      } else {
        onGraded(submission.id, gradeNum);
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Grade Submission</h2>
            <p className="text-sm text-gray-500 mt-0.5">{submission.student.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_260px]">
          {/* Left: Student's submitted work */}
          <div className="p-6 border-r border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Submitted Files & Links
            </h3>

            {submission.attachments.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No files or links submitted
              </div>
            ) : (
              <div className="space-y-2">
                {submission.attachments.map((att) => {
                  const Icon = att.type === "LINK" ? Link2 : FileText;
                  return (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 shrink-0">
                        <Icon className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {att.fileName || att.url}
                        </p>
                        <p className="text-xs text-indigo-500">
                          {att.type === "LINK" ? "Open link" : "View file"} →
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Submission timestamp */}
            {submission.submittedAt && (
              <p className="mt-4 text-xs text-gray-400">
                Submitted{" "}
                {new Date(submission.submittedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Right: Grading panel */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Grade
              </h3>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                <input
                  type="number"
                  min={0}
                  max={maxPoints ?? undefined}
                  step={0.5}
                  placeholder={`/ ${maxPoints ?? "∞"}`}
                  value={grade}
                  onChange={(e) => { setGrade(e.target.value); setError(""); }}
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              {maxPoints && (
                <p className="text-xs text-gray-400 mt-1 text-right">out of {maxPoints} pts</p>
              )}
            </div>

            {/* Current grade badge */}
            {submission.isReturned && submission.grade !== null && (
              <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-purple-700">
                  Previously graded: {submission.grade}
                </span>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              onClick={handleReturn}
              disabled={isPending || !grade}
              className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
            >
              <Send className="h-4 w-4" />
              {isPending ? "Returning..." : "Return grade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
