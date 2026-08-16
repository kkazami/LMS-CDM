"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, CheckCircle2, Clock, FileText, Star, Download, type LucideIcon } from "lucide-react";
import GradeEvaluationModal from "@/components/courses/GradeEvaluationModal";

interface SubmissionAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

interface SubmissionRow {
  id: string;
  status: string;
  grade: number | null;
  isReturned: boolean;
  submittedAt: Date | null;
  student: { id: string; name: string; email: string };
  attachments: SubmissionAttachment[];
}

interface SubmissionsClientProps {
  submissions: SubmissionRow[];
  allStudents: Array<{ id: string; name: string; email: string }>;
  maxPoints: number | null;
  itemTitle: string;
  instituteCode: string;
  courseId: string;
  itemId: string;
}

const STATUS_STYLES: Record<string, { label: string; classes: string; Icon: LucideIcon }> = {
  SUBMITTED: { label: "Submitted", classes: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  RETURNED: { label: "Returned", classes: "bg-purple-50 text-purple-700", Icon: CheckCircle2 },
  GRADED: { label: "Graded", classes: "bg-blue-50 text-blue-700", Icon: CheckCircle2 },
  DRAFT: { label: "In progress", classes: "bg-gray-100 text-gray-500", Icon: Clock },
  MISSING: { label: "Missing", classes: "bg-red-50 text-red-500", Icon: FileText },
};

export default function SubmissionsClient({
  submissions,
  allStudents,
  maxPoints,
  itemTitle,
  instituteCode,
  courseId,
  itemId,
}: SubmissionsClientProps) {
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionRow | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, number>>({});

  // Build combined student+submission list
  const submissionMap = new Map(submissions.map((s) => [s.student.id, s]));
  const rows = allStudents.map((student) => {
    const sub = submissionMap.get(student.id);
    return sub ?? {
      id: `missing-${student.id}`,
      status: "MISSING" as const,
      grade: null,
      isReturned: false,
      submittedAt: null,
      student,
      attachments: [],
    };
  });

  const submittedCount = submissions.filter((s) => s.status !== "DRAFT").length;
  const gradedCount = submissions.filter((s) => s.isReturned).length;

  function handleGraded(submissionId: string, grade: number) {
    setLocalGrades((prev) => ({ ...prev, [submissionId]: grade }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 px-6 py-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href={`/${instituteCode}/courses/${courseId}/classwork/${itemId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {itemTitle}
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Submissions</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Assigned", value: allStudents.length, color: "text-slate-800 dark:text-[#F0F2F8]", bg: "bg-white dark:bg-[#141721]" },
            { label: "Submitted", value: submittedCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Graded", value: gradedCount, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl ${bg} border border-slate-200/80 dark:border-white/5 p-5 text-center shadow-xs`}>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Export button */}
        <div className="flex justify-end">
          <a
            href={`/api/courses/${courseId}/gradebook/export`}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs"
          >
            <Download className="h-4 w-4 text-[#F97316]" />
            Export grades (CSV)
          </a>
        </div>

        {/* Submissions table */}
        <div className="rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#181B26]">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">Submitted</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">Files</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">Grade</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rows.map((row) => {
                const statusDef = STATUS_STYLES[row.status] ?? STATUS_STYLES.MISSING;
                const Icon = statusDef.Icon;
                const displayGrade = localGrades[row.id] ?? row.grade;

                return (
                  <tr
                    key={row.student.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => row.id.startsWith("missing-") ? null : setGradingSubmission(row as SubmissionRow)}
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{row.student.name}</p>
                        <p className="text-xs text-slate-400 dark:text-[#8B92A5]">{row.student.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusDef.classes}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {statusDef.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-[#8B92A5]">
                      {row.submittedAt
                        ? new Date(row.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-[#8B92A5]">
                      {row.attachments.length > 0 ? (
                        <span className="flex items-center gap-1 text-[#F97316]">
                          <FileText className="h-3.5 w-3.5" />
                          {row.attachments.length}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {displayGrade !== null ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-500 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5" />
                          {displayGrade}{maxPoints ? `/${maxPoints}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!row.id.startsWith("missing-") && (
                        <span className="text-xs font-semibold text-[#F97316] hover:underline">
                          {row.isReturned ? "Update grade" : "Grade"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade evaluation modal */}
      {gradingSubmission && (
        <GradeEvaluationModal
          submission={gradingSubmission}
          maxPoints={maxPoints}
          instituteCode={instituteCode}
          courseId={courseId}
          itemId={itemId}
          onClose={() => setGradingSubmission(null)}
          onGraded={handleGraded}
        />
      )}
    </div>
  );
}
