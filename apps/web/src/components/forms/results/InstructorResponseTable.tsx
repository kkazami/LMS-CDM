"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Download, ExternalLink, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import type { FormAttemptData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface InstructorResponseTableProps {
  attempts: FormAttemptData[];
  courseId: string;
  formId: string;
  instituteCode: string;
  theme?: InstituteTheme;
}

export default function InstructorResponseTable({
  attempts = [],
  courseId,
  formId,
  instituteCode,
  theme,
}: InstructorResponseTableProps) {
  const [search, setSearch] = useState("");
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const filtered = attempts.filter((att) => {
    const name = att.user?.name?.toLowerCase() || "";
    const email = att.user?.email?.toLowerCase() || "";
    const num = att.user?.studentNumber?.toLowerCase() || "";
    const term = search.toLowerCase();
    return name.includes(term) || email.includes(term) || num.includes(term);
  });

  return (
    <div className="space-y-4">
      {/* Top Search & Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or ID..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-hidden"
          />
        </div>

        <a
          href={`/api/courses/${courseId}/forms/${formId}/responses/export`}
          download
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export to CSV</span>
        </a>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#12151E] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Student</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-center">Attempt</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-center">Score</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-center">Percentage</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-center">Integrity</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Submitted At</th>
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No student submissions found.
                  </td>
                </tr>
              ) : (
                filtered.map((att) => {
                  const hasFlags = (att.tabSwitchCount || 0) > 0 || (att.copyPasteCount || 0) > 0;

                  return (
                    <tr
                      key={att.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {att.user?.name || "Student"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {att.user?.studentNumber ? `${att.user.studentNumber} • ` : ""}
                          {att.user?.email}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                          #{att.attemptNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {att.rawScore ?? 0} / {att.totalPoints ?? 0}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            (att.percentage ?? 0) >= 75
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {att.percentage ?? 0}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {hasFlags ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            title={`${att.tabSwitchCount} tab switch(es), ${att.copyPasteCount} copy/paste(s)`}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>{att.tabSwitchCount + att.copyPasteCount} Flags</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 dark:text-[#8B92A5] text-[11px]">
                        {att.submittedAt
                          ? new Date(att.submittedAt).toLocaleString()
                          : "In progress"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/${instituteCode}/courses/${courseId}/classwork/forms/${formId}/responses/${att.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <span>Review</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
