"use client";

import React from "react";
import type { LessonPlanFormValues, LessonPlanFramework } from "@/lib/lesson-plans/types";
import { Check, Copy, Download, FileDown, Printer } from "lucide-react";

interface LivePreviewPaneProps {
  framework: LessonPlanFramework;
  formValues: LessonPlanFormValues;
  copied: boolean;
  onCopyText: () => void;
  onDownload: (format: "txt" | "md") => void;
  onPrint: () => void;
}

export default function LivePreviewPane({
  framework,
  formValues,
  copied,
  onCopyText,
  onDownload,
  onPrint,
}: LivePreviewPaneProps) {
  const h = formValues.headers;
  const topic = h.topic.trim() || "Untitled Lesson";
  const subject = h.subject.trim() || "Not specified";
  const gradeLevel = h.gradeLevel.trim() || "Not specified";
  const date = h.date.trim() || "Not specified";
  const preparedBy = h.preparedBy.trim() || "Not specified";
  const competency = h.learningCompetency.trim() || "Not specified";
  const objectives = h.learningObjectives.trim() || "Not specified";
  const materials = h.materials.trim() || "Not specified";

  return (
    <div className="space-y-3">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-lesson-plan,
          #printable-lesson-plan * {
            visibility: visible !important;
          }
          #printable-lesson-plan {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 32px !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-theme bg-surface p-3 shadow-xs no-print">
        <div className="text-xs font-bold text-primary-theme">
          Live Formatted Preview
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onPrint}
            title="Print or Save as PDF using your browser's print dialog"
            className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme hover:bg-surface cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={onCopyText}
            className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme hover:bg-surface cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onDownload("txt")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-semibold text-secondary-theme hover:text-primary-theme hover:bg-surface cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>.txt</span>
          </button>

          <button
            type="button"
            onClick={() => onDownload("md")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>.md</span>
          </button>
        </div>
      </div>

      {/* Printable / Rendered Plan Document */}
      <div
        id="printable-lesson-plan"
        className="rounded-2xl border border-theme bg-surface p-6 sm:p-8 shadow-xs space-y-6 font-sans text-primary-theme"
      >
        {/* Document Header */}
        <div className="border-b border-theme/80 pb-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {framework.name} Lesson Plan
            </span>
            <span className="text-[11px] font-mono text-muted-theme">
              CDM LMS • Practice Template
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{topic}</h2>
        </div>

        {/* Lesson Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-theme/60 pb-5">
          <div>
            <span className="font-semibold text-muted-theme">Subject</span>
            <div className="mt-0.5 font-bold text-primary-theme">{subject}</div>
          </div>
          <div>
            <span className="font-semibold text-muted-theme">Grade / Year</span>
            <div className="mt-0.5 font-bold text-primary-theme">{gradeLevel}</div>
          </div>
          <div>
            <span className="font-semibold text-muted-theme">Date</span>
            <div className="mt-0.5 font-bold text-primary-theme">{date}</div>
          </div>
          <div>
            <span className="font-semibold text-muted-theme">Prepared By</span>
            <div className="mt-0.5 font-bold text-primary-theme">{preparedBy}</div>
          </div>
        </div>

        {/* Competency & Objectives */}
        <div className="space-y-3.5 border-b border-theme/60 pb-5 text-xs">
          <div>
            <span className="font-bold text-muted-theme uppercase tracking-wider">
              Learning Competency
            </span>
            <p className="mt-1 font-medium text-primary-theme leading-relaxed">
              {competency}
            </p>
          </div>
          <div>
            <span className="font-bold text-muted-theme uppercase tracking-wider">
              Learning Objectives
            </span>
            <div className="mt-1 font-medium text-primary-theme leading-relaxed whitespace-pre-line">
              {objectives}
            </div>
          </div>
          <div>
            <span className="font-bold text-muted-theme uppercase tracking-wider">
              Instructional Materials
            </span>
            <p className="mt-1 font-medium text-primary-theme leading-relaxed">
              {materials}
            </p>
          </div>
        </div>

        {/* Procedure Stages */}
        <div className="space-y-5">
          <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Instructional Procedure ({framework.name})
          </div>

          <div className="space-y-4">
            {framework.stages.map((stage, idx) => {
              const content = formValues.stages[stage.id]?.trim();
              return (
                <div
                  key={stage.id}
                  className="rounded-xl border border-theme/60 bg-elevated/30 p-4 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h3 className="text-xs font-bold text-primary-theme">
                      Stage {idx + 1}: {stage.name}
                    </h3>
                    <span className="text-[11px] text-muted-theme italic">
                      {stage.purpose}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-primary-theme leading-relaxed whitespace-pre-line bg-surface/80 p-3 rounded-lg border border-theme/40 min-h-[4rem]">
                    {content || (
                      <span className="italic text-muted-theme">
                        (No procedure recorded for this stage yet)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Official Disclaimer Note */}
        <div className="border-t border-theme/80 pt-4 text-center text-[11px] text-muted-theme italic">
          Templates for practice. Follow your instructor&apos;s required format and the latest DepEd guidelines.
        </div>
      </div>
    </div>
  );
}

