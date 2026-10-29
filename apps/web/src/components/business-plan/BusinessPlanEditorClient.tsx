"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Info,
  Plus,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { calculateFinancialPlan, formatPhpCurrency } from "@/lib/business-plan/calculator";
import { buildCompiledBusinessDocument } from "@/lib/business-plan/export";
import {
  LEARNING_TOPICS,
  TAX_AND_REGISTRATION_CHECKLIST,
} from "@/lib/business-plan/learning-center";
import { STEP_METADATA, validateBusinessPlan } from "@/lib/business-plan/validation";
import type {
  BusinessCategory,
  BusinessOwnershipType,
  BusinessPlanData,
  BusinessPlanRecord,
  SectionValidationStatus,
} from "@/lib/business-plan/types";

interface BusinessPlanEditorClientProps {
  instituteCode: string;
  initialRecord: BusinessPlanRecord;
  studentName: string;
}

const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  FOOD_BEVERAGE: "Food & Beverage / Café / Food Stall",
  RETAIL: "Retail Store & Merchandising",
  ONLINE_COMMERCE: "Online Selling / E-Commerce",
  SERVICES: "Service Business (Printing, Laundry, Tutoring)",
  HOSPITALITY_TOURISM: "Hospitality, Catering & Lodging",
  CAMPUS_ENTERPRISE: "Student-Run / Campus Startup",
  MANUFACTURING_PRODUCTION: "Light Production & Crafts",
};

const OWNERSHIP_OPTIONS: { value: BusinessOwnershipType; label: string }[] = [
  { value: "SOLE_PROPRIETORSHIP", label: "Sole Proprietorship (DTI Registration)" },
  { value: "PARTNERSHIP", label: "General / Limited Partnership (SEC Registration)" },
  { value: "ONE_PERSON_CORPORATION", label: "One Person Corporation (OPC — SEC)" },
  { value: "CORPORATION", label: "Regular Domestic Corporation (SEC)" },
  { value: "COOPERATIVE", label: "Cooperative (CDA Registration)" },
];

const CATEGORY_OPERATIONAL_PROMPTS: Record<BusinessCategory, string> = {
  FOOD_BEVERAGE:
    "Food & Beverage Focus: Detail food safety/sanitation practices, cold-storage capacity, recipe portion control, and peak meal-hour prep speed.",
  RETAIL:
    "Retail Focus: Detail shelf merchandising layout, SKU barcode/stock-card tracking, supplier reorder lead times, and shoplifting/shrinkage prevention.",
  ONLINE_COMMERCE:
    "Online Selling Focus: Detail order cutoff times, protective packaging specs, courier pick-up schedules, and return/refund handling policy.",
  SERVICES:
    "Service Business Focus: Detail client intake checklist, turnaround time per job, machine maintenance schedule, and service quality guarantee.",
  HOSPITALITY_TOURISM:
    "Hospitality & Catering Focus: Detail event setup/ingress timeline, buffet food-warmer logistics, guest-to-server ratio, and post-event sanitation.",
  CAMPUS_ENTERPRISE:
    "Campus Enterprise Focus: Detail student shift rotation around class schedules, campus kiosk rules, cashless payment verification, and inventory handoffs.",
  MANUFACTURING_PRODUCTION:
    "Light Production Focus: Detail batch production cycle time, raw material wastage allowance, quality inspection checkpoints, and finished-goods curing/storage.",
};

function makeRowId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function statusBadgeConfig(status: SectionValidationStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    case "READY_FOR_REVIEW":
      return {
        label: "Ready for Review",
        className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      };
    case "INVALID":
      return {
        label: "Invalid / Fix Needed",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      };
    default:
      return {
        label: "Incomplete",
        className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      };
  }
}

export default function BusinessPlanEditorClient({
  instituteCode,
  initialRecord,
  studentName,
}: BusinessPlanEditorClientProps) {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") === "preview" ? "preview" : "builder";

  const [record, setRecord] = useState<BusinessPlanRecord>(initialRecord);
  const [data, setData] = useState<BusinessPlanData>(initialRecord.data);
  const [title, setTitle] = useState<string>(initialRecord.title);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"builder" | "preview">(initialView);
  const [showStepGuide, setShowStepGuide] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const financials = useMemo(() => calculateFinancialPlan(data.financialPlan), [data.financialPlan]);
  const validation = useMemo(() => validateBusinessPlan(data), [data]);
  const compiledDoc = useMemo(
    () =>
      buildCompiledBusinessDocument(
        {
          ...record,
          title,
          documentType: "BUSINESS_PLAN",
          businessCategory: data.businessInfo.businessCategory,
          data,
        },
        studentName
      ),
    [record, title, data, studentName]
  );

  const currentStepValidation =
    validation.steps.find((s) => s.stepNumber === currentStep) ?? validation.steps[0];

  const relatedTopicsForCurrentStep = useMemo(() => {
    const map: Record<number, number[]> = {
      1: [1, 2, 3, 4],
      2: [5],
      3: [1, 14],
      4: [6, 7],
      5: [8],
      6: [9],
      7: [10],
      8: [11, 12],
      9: [11, 12],
      10: [13],
      11: [14],
    };
    const nums = map[currentStep] ?? [1];
    return LEARNING_TOPICS.filter((t) => nums.includes(t.number));
  }, [currentStep]);

  async function savePlan(targetStatus: "DRAFT" | "COMPLETED") {
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const res = await fetch(`/api/business-plan/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || data.businessInfo.businessName || "Untitled Business Plan",
          status: targetStatus,
          data,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to save business plan.");
      }
      setRecord(json.plan);
      setData(json.plan.data);
      setTitle(json.plan.title);
      setSaveBanner({
        type: "success",
        text:
          targetStatus === "COMPLETED"
            ? "Business Plan validated and marked as COMPLETED!"
            : `Draft saved at ${new Date().toLocaleTimeString("en-PH")}.`,
      });
    } catch (err) {
      setSaveBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Could not save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${instituteCode}/business-plan`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Business Plan Guide
            </Link>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold">
              Business Plan
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                record.status === "COMPLETED"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {record.status === "COMPLETED" ? "Completed" : "Working Draft"}
            </span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setData((prev) => ({
                ...prev,
                documentSetup: { ...prev.documentSetup, documentTitle: e.target.value },
              }));
            }}
            placeholder="Business Plan Title..."
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full max-w-2xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "builder" ? "preview" : "builder")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            {viewMode === "builder" ? (
              <>
                <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Document Preview
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Back to 11-Step Guide
              </>
            )}
          </button>

          <a
            href={`/api/business-plan/${record.id}/export?format=pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Export PDF
          </a>

          <a
            href={`/api/business-plan/${record.id}/export?format=docx`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Export DOCX
          </a>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => savePlan("DRAFT")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={isSaving || !validation.isReadyForCompletion}
            onClick={() => savePlan("COMPLETED")}
            title={
              validation.isReadyForCompletion
                ? "Mark Business Plan as Completed"
                : "Complete all 11 sections and resolve invalid errors before marking Completed"
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow transition cursor-pointer disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Completed
          </button>
        </div>
      </div>

      {saveBanner && (
        <div
          className={`rounded-2xl p-3.5 text-xs sm:text-sm flex items-center justify-between border print:hidden ${
            saveBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{saveBanner.text}</span>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PREVIEW MODE */}
      {viewMode === "preview" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 print:hidden">
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <strong>Printable Business Plan Preview:</strong> Review your Cover Page, Table of Contents, and all compiled sections before exporting or printing.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Print / Save as PDF
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white text-slate-900 border border-slate-200 p-8 sm:p-12 shadow-xl space-y-10 max-w-5xl mx-auto print:shadow-none print:p-0">
            {/* Cover Page */}
            <div className="border-b-2 border-slate-300 pb-10 space-y-6 text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-widest">
                Institute of Business and Entrepreneurship (IBE) • {compiledDoc.documentTypeLabel}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
                {compiledDoc.businessName}
              </h1>
              <p className="text-lg font-semibold text-slate-700">{compiledDoc.title}</p>

              <div className="max-w-xl mx-auto text-left grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs">
                <div>
                  <span className="text-slate-500 block">Prepared By:</span>
                  <strong className="text-slate-900">{compiledDoc.preparedBy}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">School / Department:</span>
                  <strong className="text-slate-900">{compiledDoc.schoolOrProgram}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Course & Section:</span>
                  <strong className="text-slate-900">{compiledDoc.courseAndSection}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Instructor:</span>
                  <strong className="text-slate-900">{compiledDoc.instructorName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Category & Structure:</span>
                  <strong className="text-slate-900">
                    {compiledDoc.categoryLabel} • {compiledDoc.ownershipLabel}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Submission Date & Status:</span>
                  <strong className="text-slate-900">
                    {compiledDoc.submissionDate} ({compiledDoc.statusLabel})
                  </strong>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <div className="border-b border-slate-200 pb-8 space-y-3">
              <h2 className="text-lg font-extrabold uppercase tracking-wider text-slate-900">
                Table of Contents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {compiledDoc.toc.map((item) => (
                  <div
                    key={item.number}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="font-semibold text-slate-800">
                      Section {item.number}. {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Sections */}
            {compiledDoc.sections.map((sec) => (
              <div key={sec.number} className="space-y-5 pt-2 break-inside-avoid-page">
                <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl">
                  <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                    Section {sec.number}: {sec.title}
                  </h2>
                </div>
                {sec.summaryNote && (
                  <p className="text-xs italic text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    {sec.summaryNote}
                  </p>
                )}

                {sec.subsections.map((sub) => (
                  <div key={sub.heading} className="space-y-2.5 pl-1">
                    <h3 className="text-sm font-bold text-slate-900">{sub.heading}</h3>
                    {sub.paragraphs.map((p, idx) => (
                      <p
                        key={`${sub.heading}-p-${idx}`}
                        className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                      >
                        {p}
                      </p>
                    ))}
                    {sub.bullets && sub.bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                        {sub.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {sub.tables &&
                      sub.tables.map((tbl) => (
                        <div key={tbl.title} className="space-y-1.5 pt-2 overflow-x-auto">
                          <div className="text-xs font-bold text-slate-800">{tbl.title}</div>
                          <table className="w-full text-xs border border-slate-300 border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900">
                                {tbl.headers.map((h, i) => (
                                  <th
                                    key={`${tbl.title}-h-${i}`}
                                    className={`border border-slate-300 px-2.5 py-2 font-bold ${
                                      tbl.align?.[i] === "right" ? "text-right" : "text-left"
                                    }`}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tbl.rows.map((r, rIdx) => (
                                <tr
                                  key={`${tbl.title}-r-${rIdx}`}
                                  className={rIdx % 2 === 1 ? "bg-slate-50" : "bg-white"}
                                >
                                  {r.map((cell, cIdx) => (
                                    <td
                                      key={`${tbl.title}-r-${rIdx}-c-${cIdx}`}
                                      className={`border border-slate-300 px-2.5 py-1.5 text-slate-800 ${
                                        tbl.align?.[cIdx] === "right" ? "text-right" : "text-left"
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              {(tbl.footer ?? []).map((fRow, fIdx) => (
                                <tr
                                  key={`${tbl.title}-f-${fIdx}`}
                                  className="bg-amber-50 font-bold text-slate-950"
                                >
                                  {fRow.map((cell, cIdx) => (
                                    <td
                                      key={`${tbl.title}-f-${fIdx}-c-${cIdx}`}
                                      className={`border border-slate-300 px-2.5 py-1.5 ${
                                        tbl.align?.[cIdx] === "right" ? "text-right" : "text-left"
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 11-STEP BUILDER MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Stepper & Validation Readiness Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Overall Progress
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{validation.completionPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.max(5, validation.completionPercentage)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {validation.completedSteps} of {validation.totalSteps} sections ready
                </p>
              </div>

              <div className="space-y-1.5">
                {STEP_METADATA.map((meta) => {
                  const stepVal = validation.steps.find((s) => s.stepNumber === meta.stepNumber);
                  const badge = statusBadgeConfig(stepVal?.status ?? "INCOMPLETE");
                  const isActive = currentStep === meta.stepNumber;
                  return (
                    <button
                      key={meta.key}
                      type="button"
                      onClick={() => setCurrentStep(meta.stepNumber)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white shadow-sm"
                          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {meta.stepNumber}
                        </span>
                        <span className="text-xs font-semibold truncate">{meta.shortTitle}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Active Step Editor */}
          <div className="lg:col-span-9 space-y-5">
            {/* Step Header & Inline Learning Guide Toggle */}
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Step {currentStep} of 11
                    </span>
                    {currentStepValidation && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          statusBadgeConfig(currentStepValidation.status).className
                        }`}
                      >
                        {statusBadgeConfig(currentStepValidation.status).label}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {STEP_METADATA[currentStep - 1]?.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStepGuide((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer self-start"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {showStepGuide ? "Hide Lesson Guide" : "Show Lesson Guide"}
                </button>
              </div>

              {/* Inline Learning Guide Drawer */}
              {showStepGuide && relatedTopicsForCurrentStep.length > 0 && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                  {relatedTopicsForCurrentStep.map((topic) => (
                    <div key={topic.id} className="space-y-1.5 text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        Learning Guide — Topic #{topic.number}: {topic.title}
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{topic.beginnerExplanation}</p>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong className="text-amber-900 dark:text-amber-200">Illustrative Example ({topic.illustrativeExample.businessName}):</strong>{" "}
                        {topic.illustrativeExample.sampleText}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation Messages for Current Step */}
              {currentStepValidation &&
                (currentStepValidation.missingFields.length > 0 ||
                  currentStepValidation.warnings.length > 0 ||
                  currentStepValidation.errors.length > 0) && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                    {currentStepValidation.errors.map((err) => (
                      <div key={err} className="flex items-start gap-2 text-rose-700 dark:text-rose-300 font-medium">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                    {currentStepValidation.warnings.map((w) => (
                      <div key={w} className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                    {currentStepValidation.missingFields.length > 0 && (
                      <div className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-slate-200">Remaining items for this step:</strong>{" "}
                        {currentStepValidation.missingFields.join(" • ")}
                      </div>
                    )}
                  </div>
                )}

              {/* STEP 1: BUSINESS PLAN SETUP & COVER DETAILS */}
              {currentStep === 1 && (
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-4 text-left">
                    <div className="font-bold text-base text-slate-900 dark:text-white">Comprehensive Business Plan</div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      Complete internal and external roadmap covering market analysis, marketing strategy, operations, management & HR, 12-month financial projections, break-even analysis, Philippine tax compliance, and risk feasibility.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Prepared By (Student / Group Members)
                      </label>
                      <input
                        type="text"
                        value={data.documentSetup.studentNames}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            documentSetup: { ...prev.documentSetup, studentNames: e.target.value },
                          }))
                        }
                        placeholder="e.g., Juan Dela Cruz, Maria Santos"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        School / Institute
                      </label>
                      <input
                        type="text"
                        value={data.documentSetup.schoolOrProgram}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            documentSetup: { ...prev.documentSetup, schoolOrProgram: e.target.value },
                          }))
                        }
                        placeholder="e.g., Institute of Business and Entrepreneurship (IBE)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Course & Section
                      </label>
                      <input
                        type="text"
                        value={data.documentSetup.courseAndSection}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            documentSetup: { ...prev.documentSetup, courseAndSection: e.target.value },
                          }))
                        }
                        placeholder="e.g., Section 3A"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Faculty Adviser / Instructor Name
                      </label>
                      <input
                        type="text"
                        value={data.documentSetup.instructorName}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            documentSetup: { ...prev.documentSetup, instructorName: e.target.value },
                          }))
                        }
                        placeholder="e.g., Prof. Roberto Reyes, MBA"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: BUSINESS INFORMATION */}
              {currentStep === 2 && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Proposed Business Name
                      </label>
                      <input
                        type="text"
                        value={data.businessInfo.businessName}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: { ...prev.businessInfo, businessName: e.target.value },
                          }))
                        }
                        placeholder="e.g., Kusina Express Rice Bowls"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Category
                      </label>
                      <select
                        value={data.businessInfo.businessCategory}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: {
                              ...prev.businessInfo,
                              businessCategory: e.target.value as BusinessCategory,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Ownership Type
                      </label>
                      <select
                        value={data.businessInfo.ownershipType}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: {
                              ...prev.businessInfo,
                              ownershipType: e.target.value as BusinessOwnershipType,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      >
                        {OWNERSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Proposed Business Location
                      </label>
                      <input
                        type="text"
                        value={data.businessInfo.location}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: { ...prev.businessInfo, location: e.target.value },
                          }))
                        }
                        placeholder="e.g., Stall 4, Commercial Arcade near Colegio de Montalban, Rodriguez, Rizal"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Business Description
                    </label>
                    <textarea
                      rows={3}
                      value={data.businessInfo.description}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          businessInfo: { ...prev.businessInfo, description: e.target.value },
                        }))
                      }
                      placeholder="Describe what your business is, how it operates, and who it serves..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Problem the Business Intends to Solve
                    </label>
                    <textarea
                      rows={2}
                      value={data.businessInfo.problemSolved}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          businessInfo: { ...prev.businessInfo, problemSolved: e.target.value },
                        }))
                      }
                      placeholder="What specific customer pain point or gap in the local market does your venture solve?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Products or Services Offered
                    </label>
                    <textarea
                      rows={2}
                      value={data.businessInfo.productsOrServices}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          businessInfo: { ...prev.businessInfo, productsOrServices: e.target.value },
                        }))
                      }
                      placeholder="List your main products or service packages and their price range..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Mission Statement
                      </label>
                      <textarea
                        rows={2}
                        value={data.businessInfo.mission}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: { ...prev.businessInfo, mission: e.target.value },
                          }))
                        }
                        placeholder="Why your business exists today and how it serves customers..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Vision Statement
                      </label>
                      <textarea
                        rows={2}
                        value={data.businessInfo.vision}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            businessInfo: { ...prev.businessInfo, vision: e.target.value },
                          }))
                        }
                        placeholder="Where your business aspires to be in 3 to 5 years..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Specific Business Objectives (Short-Term & Year 1)
                    </label>
                    <textarea
                      rows={3}
                      value={data.businessInfo.objectives}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          businessInfo: { ...prev.businessInfo, objectives: e.target.value },
                        }))
                      }
                      placeholder="1) Achieve break-even within X months; 2) Serve Y customers daily; 3) Maintain Z% gross margin..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: EXECUTIVE SUMMARY */}
              {currentStep === 3 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Important Tip:</strong> Although the Executive Summary appears at the very beginning of your printed Business Plan, it is{" "}
                      <strong>normally finalized last</strong> after you complete your Market Analysis, Operations, HR, and Financial Plan (Step 8) so your summary numbers match your financial tables.
                    </div>
                  </div>

                  {[
                    {
                      key: "businessConcept" as const,
                      label: "Business Concept Overview",
                      placeholder: "Summarize the core business idea, value offered, and legal structure...",
                    },
                    {
                      key: "targetMarketSummary" as const,
                      label: "Target Market Summary",
                      placeholder: "Who are your primary customers and where are they located?",
                    },
                    {
                      key: "productsServicesSummary" as const,
                      label: "Products & Services Summary",
                      placeholder: "Highlight your flagship products or services and price points...",
                    },
                    {
                      key: "competitiveAdvantage" as const,
                      label: "Competitive Advantage (Why Customers Choose You)",
                      placeholder: "What differentiates your venture from existing alternatives?",
                    },
                    {
                      key: "financialOverview" as const,
                      label: "Financial Overview (Startup Capital, Projected Revenue & Net Profit)",
                      placeholder: `Current Calculated Snapshot: Startup Capital = ${formatPhpCurrency(financials.totalStartupCosts)}, Monthly Revenue = ${formatPhpCurrency(financials.monthlySalesRevenue)}, Monthly Net Profit = ${formatPhpCurrency(financials.monthlyNetProfit)}...`,
                    },
                    {
                      key: "businessObjectivesSummary" as const,
                      label: "Key Business Objectives Summary",
                      placeholder: "Summarize your key Year 1 milestones and operational goals...",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {field.label}
                      </label>
                      <textarea
                        rows={2}
                        value={data.executiveSummary[field.key]}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            executiveSummary: {
                              ...prev.executiveSummary,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 4: MARKET ANALYSIS */}
              {currentStep === 4 && (
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                    <strong>Research Integrity Reminder:</strong> Never fabricate survey statistics or competitor numbers. Enter your actual student survey/observation findings, or clearly label preliminary assumptions as illustrative estimates.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Customers (Demographics & Behavior)
                      </label>
                      <textarea
                        rows={3}
                        value={data.marketAnalysis.targetCustomers}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: { ...prev.marketAnalysis, targetCustomers: e.target.value },
                          }))
                        }
                        placeholder="Who are your primary and secondary buyers? (Age, budget, location, buying frequency)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Customer Needs & Buying Preferences
                      </label>
                      <textarea
                        rows={3}
                        value={data.marketAnalysis.customerNeeds}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: { ...prev.marketAnalysis, customerNeeds: e.target.value },
                          }))
                        }
                        placeholder="What do your target customers value most? (Speed, affordability, quality, convenience)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Market Research Findings
                      </label>
                      <textarea
                        rows={3}
                        value={data.marketAnalysis.marketResearchFindings}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: {
                              ...prev.marketAnalysis,
                              marketResearchFindings: e.target.value,
                            },
                          }))
                        }
                        placeholder="Summarize foot-traffic observations, local demand, and industry context..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Student Survey / Interview Results Summary
                      </label>
                      <textarea
                        rows={3}
                        value={data.marketAnalysis.surveyResultsSummary}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: {
                              ...prev.marketAnalysis,
                              surveyResultsSummary: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter findings from your student survey or interviews (sample size, key responses, price acceptability)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Competitor Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Competitor Comparison Table
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: {
                              ...prev.marketAnalysis,
                              competitors: [
                                ...prev.marketAnalysis.competitors,
                                {
                                  id: makeRowId("comp"),
                                  name: "",
                                  priceRange: "",
                                  strengths: "",
                                  weaknesses: "",
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Competitor
                      </button>
                    </div>

                    <div className="space-y-2">
                      {data.marketAnalysis.competitors.map((comp, idx) => (
                        <div
                          key={comp.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                        >
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => {
                              const next = [...data.marketAnalysis.competitors];
                              next[idx] = { ...comp, name: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                marketAnalysis: { ...prev.marketAnalysis, competitors: next },
                              }));
                            }}
                            placeholder="Competitor Name"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={comp.priceRange}
                            onChange={(e) => {
                              const next = [...data.marketAnalysis.competitors];
                              next[idx] = { ...comp, priceRange: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                marketAnalysis: { ...prev.marketAnalysis, competitors: next },
                              }));
                            }}
                            placeholder="Price Range (e.g., PHP 65-95)"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={comp.strengths}
                            onChange={(e) => {
                              const next = [...data.marketAnalysis.competitors];
                              next[idx] = { ...comp, strengths: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                marketAnalysis: { ...prev.marketAnalysis, competitors: next },
                              }));
                            }}
                            placeholder="Competitor Strengths"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={comp.weaknesses}
                            onChange={(e) => {
                              const next = [...data.marketAnalysis.competitors];
                              next[idx] = { ...comp, weaknesses: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                marketAnalysis: { ...prev.marketAnalysis, competitors: next },
                              }));
                            }}
                            placeholder="Weaknesses / Market Gap"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                marketAnalysis: {
                                  ...prev.marketAnalysis,
                                  competitors: prev.marketAnalysis.competitors.filter(
                                    (c) => c.id !== comp.id
                                  ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Remove Competitor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Market Opportunities
                    </label>
                    <textarea
                      rows={2}
                      value={data.marketAnalysis.marketOpportunities}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          marketAnalysis: {
                            ...prev.marketAnalysis,
                            marketOpportunities: e.target.value,
                          },
                        }))
                      }
                      placeholder="What underserved segments, partnerships, or growth opportunities exist?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* SWOT Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                        SWOT — Strengths (Internal)
                      </label>
                      <textarea
                        rows={2}
                        value={data.marketAnalysis.swotStrengths}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: { ...prev.marketAnalysis, swotStrengths: e.target.value },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                        SWOT — Weaknesses (Internal)
                      </label>
                      <textarea
                        rows={2}
                        value={data.marketAnalysis.swotWeaknesses}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: { ...prev.marketAnalysis, swotWeaknesses: e.target.value },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-1.5">
                        SWOT — Opportunities (External)
                      </label>
                      <textarea
                        rows={2}
                        value={data.marketAnalysis.swotOpportunities}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: {
                              ...prev.marketAnalysis,
                              swotOpportunities: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1.5">
                        SWOT — Threats (External)
                      </label>
                      <textarea
                        rows={2}
                        value={data.marketAnalysis.swotThreats}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketAnalysis: { ...prev.marketAnalysis, swotThreats: e.target.value },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: MARKETING & SALES PLAN */}
              {currentStep === 5 && (
                <div className="space-y-4 pt-2">
                  {[
                    {
                      key: "productServiceStrategy" as const,
                      label: "Product or Service Strategy",
                      placeholder:
                        "Example: Offer 3 core rice bowl variants with standardized 180g portions and eco-friendly kraft bowls...",
                    },
                    {
                      key: "pricingStrategy" as const,
                      label: "Pricing Strategy (Cost-Plus, Value-Based, or Bundle Pricing)",
                      placeholder:
                        "Example: Cost-plus pricing maintaining a 55% gross margin (PHP 35 COGS sold at PHP 79) plus student combo discounts...",
                    },
                    {
                      key: "promotionAdvertising" as const,
                      label: "Promotion and Advertising Plan",
                      placeholder:
                        "Example: Campus Facebook page reels, TikTok taste-test videos, tarpaulin signage, and org sponsorship booths...",
                    },
                    {
                      key: "distributionDelivery" as const,
                      label: "Distribution or Delivery Approach",
                      placeholder:
                        "Example: Walk-in counter pickup plus scheduled campus gate drop-offs at 11:30 AM and 4:00 PM...",
                    },
                    {
                      key: "salesChannels" as const,
                      label: "Sales Channels (Physical, Social Commerce, Messenger, Marketplace)",
                      placeholder:
                        "Example: Physical stall (75% of sales) and Facebook Messenger pre-order form with GCash/Maya QRPh (25%)...",
                    },
                    {
                      key: "customerAcquisition" as const,
                      label: "Customer Acquisition Strategy",
                      placeholder:
                        "How will you attract your first 100 paying customers during launch month?",
                    },
                    {
                      key: "customerRetention" as const,
                      label: "Customer Retention & Loyalty Program",
                      placeholder:
                        "How will you encourage repeat purchases (e.g., 10-stamp loyalty card, org bulk discounts)?",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {field.label}
                      </label>
                      <textarea
                        rows={2}
                        value={data.marketingSalesPlan[field.key]}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            marketingSalesPlan: {
                              ...prev.marketingSalesPlan,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 6: OPERATIONAL PLAN */}
              {currentStep === 6 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                    <strong>Category Guidance ({CATEGORY_LABELS[data.businessInfo.businessCategory]}):</strong>{" "}
                    {CATEGORY_OPERATIONAL_PROMPTS[data.businessInfo.businessCategory]}
                  </div>

                  {[
                    {
                      key: "businessLocation" as const,
                      label: "Business Location & Physical Layout",
                      placeholder: "Describe the workspace layout, utilities (water/electricity/internet), and accessibility...",
                    },
                    {
                      key: "equipmentAndSupplies" as const,
                      label: "Equipment, Tools, and Supplies Needed",
                      placeholder: "List commercial equipment, furniture, POS tools, and daily operating supplies...",
                    },
                    {
                      key: "materialsAndSuppliers" as const,
                      label: "Raw Materials & Primary/Backup Suppliers",
                      placeholder: "Identify where you source materials/inventory and your backup suppliers...",
                    },
                    {
                      key: "productionOrServiceProcess" as const,
                      label: "Step-by-Step Production or Service-Delivery Process",
                      placeholder: "Step 1: Prep/Intake -> Step 2: Processing/Cooking -> Step 3: QA Check -> Step 4: Handover & Payment...",
                    },
                    {
                      key: "inventoryRequirements" as const,
                      label: "Inventory Management & Reorder Policy",
                      placeholder: "FIFO stock rotation, safety buffer stock, and weekly physical count schedule...",
                    },
                    {
                      key: "operatingSchedule" as const,
                      label: "Operating Days & Hours Schedule",
                      placeholder: "e.g., Monday to Saturday, 7:30 AM to 6:30 PM (26 operating days per month)...",
                    },
                    {
                      key: "estimatedOperatingCapacity" as const,
                      label: "Estimated Daily & Monthly Operating Capacity",
                      placeholder: "Maximum units/clients served per hour and per day without bottlenecks...",
                    },
                    {
                      key: "qualityControl" as const,
                      label: "Quality Control, Sanitation & Safety Standards",
                      placeholder: "Portioning scales, defect checks, sanitation logs, and customer feedback handling...",
                    },
                    {
                      key: "categorySpecificNotes" as const,
                      label: `Category-Specific Operational Plan (${CATEGORY_LABELS[data.businessInfo.businessCategory]})`,
                      placeholder: CATEGORY_OPERATIONAL_PROMPTS[data.businessInfo.businessCategory],
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {field.label}
                      </label>
                      <textarea
                        rows={2}
                        value={data.operationalPlan[field.key]}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            operationalPlan: {
                              ...prev.operationalPlan,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 7: MANAGEMENT & HR PLAN */}
              {currentStep === 7 && (
                <div className="space-y-5 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Organizational Structure
                      </label>
                      <textarea
                        rows={3}
                        value={data.managementHrPlan.organizationalStructure}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            managementHrPlan: {
                              ...prev.managementHrPlan,
                              organizationalStructure: e.target.value,
                            },
                          }))
                        }
                        placeholder="Describe reporting lines (e.g., General Manager -> Operations Lead, Finance Lead, Marketing Lead)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Ownership & Management Roles
                      </label>
                      <textarea
                        rows={3}
                        value={data.managementHrPlan.ownershipManagementRoles}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            managementHrPlan: {
                              ...prev.managementHrPlan,
                              ownershipManagementRoles: e.target.value,
                            },
                          }))
                        }
                        placeholder="Specify decision-making authority, cash-disbursement sign-offs, and owner duties..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Staffing Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Staffing Requirements & Monthly Compensation Table
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            managementHrPlan: {
                              ...prev.managementHrPlan,
                              staffingRequirements: [
                                ...prev.managementHrPlan.staffingRequirements,
                                {
                                  id: makeRowId("staff"),
                                  roleTitle: "",
                                  headcount: 1,
                                  monthlyCompensation: 0,
                                  responsibilities: "",
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Role
                      </button>
                    </div>

                    <div className="space-y-2">
                      {data.managementHrPlan.staffingRequirements.map((staff, idx) => (
                        <div
                          key={staff.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                        >
                          <input
                            type="text"
                            value={staff.roleTitle}
                            onChange={(e) => {
                              const next = [...data.managementHrPlan.staffingRequirements];
                              next[idx] = { ...staff, roleTitle: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                managementHrPlan: {
                                  ...prev.managementHrPlan,
                                  staffingRequirements: next,
                                },
                              }));
                            }}
                            placeholder="Position / Role Title"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="number"
                            min={1}
                            value={staff.headcount}
                            onChange={(e) => {
                              const next = [...data.managementHrPlan.staffingRequirements];
                              next[idx] = {
                                ...staff,
                                headcount: Math.max(1, Number(e.target.value) || 1),
                              };
                              setData((prev) => ({
                                ...prev,
                                managementHrPlan: {
                                  ...prev.managementHrPlan,
                                  staffingRequirements: next,
                                },
                              }));
                            }}
                            placeholder="Headcount"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            value={staff.monthlyCompensation}
                            onChange={(e) => {
                              const next = [...data.managementHrPlan.staffingRequirements];
                              next[idx] = {
                                ...staff,
                                monthlyCompensation: Math.max(0, Number(e.target.value) || 0),
                              };
                              setData((prev) => ({
                                ...prev,
                                managementHrPlan: {
                                  ...prev.managementHrPlan,
                                  staffingRequirements: next,
                                },
                              }));
                            }}
                            placeholder="Monthly Pay (PHP)"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={staff.responsibilities}
                            onChange={(e) => {
                              const next = [...data.managementHrPlan.staffingRequirements];
                              next[idx] = { ...staff, responsibilities: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                managementHrPlan: {
                                  ...prev.managementHrPlan,
                                  staffingRequirements: next,
                                },
                              }));
                            }}
                            placeholder="Key Duties & Shift Schedule"
                            className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                managementHrPlan: {
                                  ...prev.managementHrPlan,
                                  staffingRequirements:
                                    prev.managementHrPlan.staffingRequirements.filter(
                                      (s) => s.id !== staff.id
                                    ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {[
                    {
                      key: "jobDescriptions" as const,
                      label: "Job Descriptions & Qualifications (Recruitment & Selection)",
                    },
                    {
                      key: "employeeResponsibilities" as const,
                      label: "Daily Employee Responsibilities & Shift Handover",
                    },
                    {
                      key: "recruitmentSelectionApproach" as const,
                      label: "Recruitment & Selection Process (Job Posting, Screening, Practical Trial)",
                    },
                    {
                      key: "employeeTraining" as const,
                      label: "Employee Onboarding & Training Program (Organizational Development)",
                    },
                    {
                      key: "workplacePolicies" as const,
                      label: "Basic Workplace Policies (Attendance, Safety, Cash Handling, Ethics)",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {field.label}
                      </label>
                      <textarea
                        rows={2}
                        value={data.managementHrPlan[field.key]}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            managementHrPlan: {
                              ...prev.managementHrPlan,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 8: FINANCIAL PLAN AND CALCULATOR */}
              {currentStep === 8 && (
                <div className="space-y-6 pt-2">
                  {/* Live Deterministic Formula Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Total Startup Costs
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {formatPhpCurrency(financials.totalStartupCosts)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Sum of startup items</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Sales Revenue / Mo
                      </div>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatPhpCurrency(financials.monthlySalesRevenue)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Qty Sold × Selling Price</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Gross Profit / Mo
                      </div>
                      <div className="text-sm font-extrabold text-sky-600 dark:text-sky-300 mt-1">
                        {formatPhpCurrency(financials.monthlyGrossProfit)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Revenue − COGS</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Operating Profit / Mo
                      </div>
                      <div className="text-sm font-extrabold text-amber-700 dark:text-amber-300 mt-1">
                        {formatPhpCurrency(financials.monthlyOperatingProfit)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Gross Profit − OPEX</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Net Profit / Mo
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-1 ${
                          financials.monthlyNetProfit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatPhpCurrency(financials.monthlyNetProfit)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Total Rev − Total Exp
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Break-Even Units
                      </div>
                      <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                        {financials.breakEven.isCalculable &&
                        financials.breakEven.breakEvenUnits !== null
                          ? `${financials.breakEven.breakEvenUnits.toLocaleString("en-PH")} units`
                          : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Fixed ÷ Unit Margin
                      </div>
                    </div>
                  </div>

                  {/* Table 8A: Startup Costs */}
                  <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          1. Startup Capital Requirements (One-Time Setup & Equipment)
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Startup capital expenditures (CAPEX) are separated from recurring monthly operating expenses so costs are never double-counted.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              startupCosts: [
                                ...prev.financialPlan.startupCosts,
                                {
                                  id: makeRowId("sc"),
                                  description: "",
                                  category: "CAPEX",
                                  amount: 0,
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Startup Cost Row
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {data.financialPlan.startupCosts.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => {
                              const next = [...data.financialPlan.startupCosts];
                              next[idx] = { ...row, description: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, startupCosts: next },
                              }));
                            }}
                            placeholder="Startup Item Description (e.g., Commercial Freezer, Permits)"
                            className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <select
                            value={row.category}
                            onChange={(e) => {
                              const next = [...data.financialPlan.startupCosts];
                              next[idx] = {
                                ...row,
                                category: e.target.value as
                                  | "CAPEX"
                                  | "PRE_OPERATING"
                                  | "WORKING_CAPITAL",
                              };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, startupCosts: next },
                              }));
                            }}
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="CAPEX">Capital Equipment (CAPEX)</option>
                            <option value="PRE_OPERATING">Pre-Operating / Permits</option>
                            <option value="WORKING_CAPITAL">Initial Working Capital Reserve</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...data.financialPlan.startupCosts];
                              next[idx] = { ...row, amount: Number(e.target.value) || 0 };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, startupCosts: next },
                              }));
                            }}
                            placeholder="Amount (PHP)"
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                financialPlan: {
                                  ...prev.financialPlan,
                                  startupCosts: prev.financialPlan.startupCosts.filter(
                                    (r) => r.id !== row.id
                                  ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table 8B: Owner Contributions & Funding Sources */}
                  <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          2. Owner Contributions & Startup Funding Sources
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Accounting Rule: Owner capital contributions are financing inflows, <strong>never counted as sales revenue</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              fundingSources: [
                                ...prev.financialPlan.fundingSources,
                                {
                                  id: makeRowId("fund"),
                                  description: "",
                                  sourceType: "OWNER_EQUITY",
                                  amount: 0,
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Funding Source
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {data.financialPlan.fundingSources.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => {
                              const next = [...data.financialPlan.fundingSources];
                              next[idx] = { ...row, description: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, fundingSources: next },
                              }));
                            }}
                            placeholder="Funding Source (e.g., Co-Founders Personal Equity Contribution)"
                            className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <select
                            value={row.sourceType}
                            onChange={(e) => {
                              const next = [...data.financialPlan.fundingSources];
                              next[idx] = {
                                ...row,
                                sourceType: e.target.value as
                                  | "OWNER_EQUITY"
                                  | "FAMILY_GRANT"
                                  | "LOAN",
                              };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, fundingSources: next },
                              }));
                            }}
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="OWNER_EQUITY">Owner Equity Contribution</option>
                            <option value="FAMILY_GRANT">Family / Seed Grant</option>
                            <option value="LOAN">Micro-Loan / Payable</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...data.financialPlan.fundingSources];
                              next[idx] = { ...row, amount: Number(e.target.value) || 0 };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, fundingSources: next },
                              }));
                            }}
                            placeholder="Amount (PHP)"
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                financialPlan: {
                                  ...prev.financialPlan,
                                  fundingSources: prev.financialPlan.fundingSources.filter(
                                    (r) => r.id !== row.id
                                  ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table 8C: Sales Forecast & Direct Unit Cost (COGS) */}
                  <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          3. Monthly Sales Forecast & Direct Unit Costs (COGS)
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Formula: <strong>Sales Revenue = Quantity Sold × Selling Price</strong> |{" "}
                          <strong>Gross Profit = Revenue − Cost of Goods Sold</strong>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              salesForecast: [
                                ...prev.financialPlan.salesForecast,
                                {
                                  id: makeRowId("sale"),
                                  productOrServiceName: "",
                                  monthlyQuantity: 0,
                                  sellingPricePerUnit: 0,
                                  unitVariableCost: 0,
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Product / Service Line
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 pt-2">
                      <div className="col-span-4">Product / Service Name</div>
                      <div className="col-span-2 text-right">Monthly Qty</div>
                      <div className="col-span-2 text-right">Selling Price</div>
                      <div className="col-span-2 text-right">Unit Cost (COGS)</div>
                      <div className="col-span-1 text-right">Revenue</div>
                      <div className="col-span-1" />
                    </div>

                    <div className="space-y-2">
                      {data.financialPlan.salesForecast.map((row, idx) => {
                        const lineRevenue = row.monthlyQuantity * row.sellingPricePerUnit;
                        return (
                          <div
                            key={row.id}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={row.productOrServiceName}
                              onChange={(e) => {
                                const next = [...data.financialPlan.salesForecast];
                                next[idx] = { ...row, productOrServiceName: e.target.value };
                                setData((prev) => ({
                                  ...prev,
                                  financialPlan: { ...prev.financialPlan, salesForecast: next },
                                }));
                              }}
                              placeholder="Product / Service Name"
                              className="sm:col-span-4 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                            />
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.monthlyQuantity}
                              onChange={(e) => {
                                const next = [...data.financialPlan.salesForecast];
                                next[idx] = { ...row, monthlyQuantity: Number(e.target.value) || 0 };
                                setData((prev) => ({
                                  ...prev,
                                  financialPlan: { ...prev.financialPlan, salesForecast: next },
                                }));
                              }}
                              placeholder="Qty/Mo"
                              className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                            />
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.sellingPricePerUnit}
                              onChange={(e) => {
                                const next = [...data.financialPlan.salesForecast];
                                next[idx] = {
                                  ...row,
                                  sellingPricePerUnit: Number(e.target.value) || 0,
                                };
                                setData((prev) => ({
                                  ...prev,
                                  financialPlan: { ...prev.financialPlan, salesForecast: next },
                                }));
                              }}
                              placeholder="Price"
                              className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                            />
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.unitVariableCost}
                              onChange={(e) => {
                                const next = [...data.financialPlan.salesForecast];
                                next[idx] = {
                                  ...row,
                                  unitVariableCost: Number(e.target.value) || 0,
                                };
                                setData((prev) => ({
                                  ...prev,
                                  financialPlan: { ...prev.financialPlan, salesForecast: next },
                                }));
                              }}
                              placeholder="Unit Cost"
                              className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                            />
                            <div className="sm:col-span-1 text-right text-xs font-bold text-emerald-600 dark:text-emerald-300 truncate">
                              {formatPhpCurrency(lineRevenue)}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setData((prev) => ({
                                  ...prev,
                                  financialPlan: {
                                    ...prev.financialPlan,
                                    salesForecast: prev.financialPlan.salesForecast.filter(
                                      (r) => r.id !== row.id
                                    ),
                                  },
                                }))
                              }
                              className="sm:col-span-1 flex justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table 8D: Monthly Operating Expenses (OPEX) */}
                  <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          4. Monthly Operating Expenses (OPEX)
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Recurring monthly expenses (rent, utilities, salaries, marketing). Fixed OPEX drives your Break-Even calculation.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              operatingExpenses: [
                                ...prev.financialPlan.operatingExpenses,
                                {
                                  id: makeRowId("opex"),
                                  description: "",
                                  costBehavior: "FIXED",
                                  monthlyAmount: 0,
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Operating Expense
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {data.financialPlan.operatingExpenses.map((row, idx) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => {
                              const next = [...data.financialPlan.operatingExpenses];
                              next[idx] = { ...row, description: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, operatingExpenses: next },
                              }));
                            }}
                            placeholder="Expense Description (e.g., Monthly Stall Rent, Staff Allowance)"
                            className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <select
                            value={row.costBehavior}
                            onChange={(e) => {
                              const next = [...data.financialPlan.operatingExpenses];
                              next[idx] = {
                                ...row,
                                costBehavior: e.target.value as "FIXED" | "VARIABLE",
                              };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, operatingExpenses: next },
                              }));
                            }}
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="FIXED">Fixed Cost (Monthly)</option>
                            <option value="VARIABLE">Variable Operating Cost</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.monthlyAmount}
                            onChange={(e) => {
                              const next = [...data.financialPlan.operatingExpenses];
                              next[idx] = { ...row, monthlyAmount: Number(e.target.value) || 0 };
                              setData((prev) => ({
                                ...prev,
                                financialPlan: { ...prev.financialPlan, operatingExpenses: next },
                              }));
                            }}
                            placeholder="Monthly PHP"
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                financialPlan: {
                                  ...prev.financialPlan,
                                  operatingExpenses: prev.financialPlan.operatingExpenses.filter(
                                    (r) => r.id !== row.id
                                  ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Depreciation, Non-Operating & Tax Provision */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Est. Monthly Equipment Depreciation (Non-Cash)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={data.financialPlan.estimatedMonthlyDepreciation}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              estimatedMonthlyDepreciation: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Monthly Non-Operating Expense (e.g., Interest)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={data.financialPlan.monthlyNonOperatingExpense}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              monthlyNonOperatingExpense: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Estimated Monthly Tax Provision (Educational)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={data.financialPlan.estimatedMonthlyTaxExpense}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            financialPlan: {
                              ...prev.financialPlan,
                              estimatedMonthlyTaxExpense: Math.max(0, Number(e.target.value) || 0),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Break-Even & Cash Flow vs Profit Summary Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="w-4 h-4" />
                        Break-Even Analysis
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {financials.breakEven.explanation}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-300">
                        <div>
                          Fixed Costs/Mo:{" "}
                          <strong className="text-slate-900 dark:text-white">
                            {formatPhpCurrency(financials.monthlyFixedOperatingExpenses)}
                          </strong>
                        </div>
                        <div>
                          Unit Contribution Margin:{" "}
                          <strong className="text-slate-900 dark:text-white">
                            {formatPhpCurrency(
                              financials.breakEven.weightedContributionMarginPerUnit
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                      <div className="font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                        Cash Flow vs. Accounting Profit Distinction
                      </div>
                      <div className="space-y-1 text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Opening Cash Balance (After CAPEX/Setup):</span>
                          <strong className="text-slate-900 dark:text-white">
                            {formatPhpCurrency(financials.openingCashBalance)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Accounting Net Profit:</span>
                          <strong className="text-amber-700 dark:text-amber-300">
                            {formatPhpCurrency(financials.monthlyNetProfit)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Operating Cash Flow (+Non-Cash Depr.):</span>
                          <strong className="text-emerald-600 dark:text-emerald-300">
                            {formatPhpCurrency(financials.monthlyOperatingCashFlow)}
                          </strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
                          <span>Projected Year 1 Ending Cash Balance:</span>
                          <strong className="text-slate-900 dark:text-white">
                            {formatPhpCurrency(financials.projectedYearOneEndingCash)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Financial Assumptions (Required Explanation Behind Your Projections)
                    </label>
                    <textarea
                      rows={3}
                      value={data.financialPlan.financialAssumptions}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          financialPlan: {
                            ...prev.financialPlan,
                            financialAssumptions: e.target.value,
                          },
                        }))
                      }
                      placeholder="Explain operating days per month, daily volume basis, supplier price assumptions, and depreciation basis..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 9: TAX & FINANCIAL CONSIDERATIONS */}
              {currentStep === 9 && (
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <div className="font-bold uppercase tracking-wider">
                      Philippine Business Registration & Tax Educational Notice
                    </div>
                    <p className="leading-relaxed">
                      Tax obligations depend on your business structure (Sole Proprietorship, Partnership, OPC, Corporation, or Cooperative), business activities, gross sales threshold, and current Philippine laws and revenue regulations. Simplified educational estimates in this guide are{" "}
                      <strong>not authoritative tax computations</strong>. Always verify current rules directly with the{" "}
                      <a
                        href="https://www.bir.gov.ph"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-bold text-amber-800 dark:text-amber-300"
                      >
                        Bureau of Internal Revenue (BIR)
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://www.dti.gov.ph"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-bold text-amber-800 dark:text-amber-300"
                      >
                        Department of Trade and Industry (DTI)
                      </a>
                      .
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Interactive Philippine Registration & Taxation Checklist (Select at least 3 reviewed items)
                    </h3>
                    {TAX_AND_REGISTRATION_CHECKLIST.map((item) => {
                      const isChecked = data.taxConsiderations.checkedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 transition ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? data.taxConsiderations.checkedItemIds.filter(
                                      (id) => id !== item.id
                                    )
                                  : [...data.taxConsiderations.checkedItemIds, item.id];
                                setData((prev) => ({
                                  ...prev,
                                  taxConsiderations: {
                                    ...prev.taxConsiderations,
                                    checkedItemIds: next,
                                  },
                                }));
                              }}
                              className="mt-1 rounded border-slate-400 dark:border-slate-600 text-amber-500"
                            />
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</span>
                                <a
                                  href={item.officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                                >
                                  {item.agency} Official Portal
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Chosen Legal Structure & Registration Plan Notes
                    </label>
                    <textarea
                      rows={2}
                      value={data.taxConsiderations.chosenStructureNotes}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          taxConsiderations: {
                            ...prev.taxConsiderations,
                            chosenStructureNotes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Explain why you selected Sole Proprietorship (DTI), Partnership/OPC (SEC), etc. and which LGU permits apply..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Bookkeeping, Official Invoicing & Tax Compliance Plan
                    </label>
                    <textarea
                      rows={2}
                      value={data.taxConsiderations.regulatoryComplianceNotes}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          taxConsiderations: {
                            ...prev.taxConsiderations,
                            regulatoryComplianceNotes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Describe how the business will maintain registered books of accounts, issue BIR invoices, and file periodic returns..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 10: RISK ASSESSMENT & FEASIBILITY */}
              {currentStep === 10 && (
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Important Evaluation Rule:</strong> Completing this form does{" "}
                      <strong>not automatically label your business as feasible</strong>. You must critically review market demand, operational capacity, capital requirements, and projected profitability, then write your evidence-based feasibility conclusion below.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "marketRisks" as const, label: "Market & Competition Risks" },
                      { key: "financialRisks" as const, label: "Financial & Cash-Flow Risks" },
                      { key: "operationalRisks" as const, label: "Operational & Supply-Chain Risks" },
                      { key: "staffingRisks" as const, label: "Staffing & Scheduling Risks" },
                      { key: "regulatoryRisks" as const, label: "Regulatory & Compliance Risks" },
                      { key: "mitigationStrategies" as const, label: "Concrete Risk Mitigation Strategies" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          {field.label}
                        </label>
                        <textarea
                          rows={2}
                          value={data.riskFeasibility[field.key]}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              riskFeasibility: {
                                ...prev.riskFeasibility,
                                [field.key]: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* 4-Pillar Feasibility Review Checklist */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Four-Pillar Feasibility Review Checklist
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {[
                        {
                          key: "marketDemandVerified" as const,
                          label: "1. Market Demand: Target customer volume is realistic for our location/channels.",
                        },
                        {
                          key: "operationalCapacityRealistic" as const,
                          label: "2. Operational Capacity: Equipment and staffing can fulfill the forecasted volume.",
                        },
                        {
                          key: "capitalRequirementsAchievable" as const,
                          label: "3. Capital Adequacy: Funding sources cover startup costs + working capital.",
                        },
                        {
                          key: "projectedProfitabilityPositive" as const,
                          label: "4. Projected Profitability: Unit margin is positive and exceeds break-even volume.",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={data.riskFeasibility.feasibilityChecklist[item.key]}
                            onChange={(e) =>
                              setData((prev) => ({
                                ...prev,
                                riskFeasibility: {
                                  ...prev.riskFeasibility,
                                  feasibilityChecklist: {
                                    ...prev.riskFeasibility.feasibilityChecklist,
                                    [item.key]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="mt-0.5 rounded border-slate-400 dark:border-slate-600 text-amber-500"
                          />
                          <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Student Feasibility Assessment Status
                      </label>
                      <select
                        value={data.riskFeasibility.feasibilityConclusionStatus}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            riskFeasibility: {
                              ...prev.riskFeasibility,
                              feasibilityConclusionStatus: e.target.value as
                                | "UNREVIEWED"
                                | "FEASIBLE_WITH_CONDITIONS"
                                | "NEEDS_REVISION",
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="UNREVIEWED">Unreviewed (Select Assessment)</option>
                        <option value="FEASIBLE_WITH_CONDITIONS">
                          Feasible Under Stated Assumptions & Conditions
                        </option>
                        <option value="NEEDS_REVISION">
                          Needs Model Revision Before Launch
                        </option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Student Feasibility Conclusion & Justification
                      </label>
                      <textarea
                        rows={2}
                        value={data.riskFeasibility.feasibilityStudentConclusion}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            riskFeasibility: {
                              ...prev.riskFeasibility,
                              feasibilityStudentConclusion: e.target.value,
                            },
                          }))
                        }
                        placeholder="Justify your feasibility assessment using your break-even volume, capital reserve, and risk mitigations..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 11: CONCLUSION & SUPPORTING DOCUMENTS */}
              {currentStep === 11 && (
                <div className="space-y-5 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Overall Business Conclusion & Next Steps
                    </label>
                    <textarea
                      rows={3}
                      value={data.conclusionAppendices.businessConclusion}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          conclusionAppendices: {
                            ...prev.conclusionAppendices,
                            businessConclusion: e.target.value,
                          },
                        }))
                      }
                      placeholder="Summarize why your business plan is ready for implementation and what immediate actions follow..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Implementation Timeline Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Implementation Timeline Milestones
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            conclusionAppendices: {
                              ...prev.conclusionAppendices,
                              implementationTimeline: [
                                ...prev.conclusionAppendices.implementationTimeline,
                                {
                                  id: makeRowId("time"),
                                  phase: "",
                                  targetPeriod: "",
                                  responsiblePerson: "",
                                  deliverable: "",
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Milestone
                      </button>
                    </div>

                    <div className="space-y-2">
                      {data.conclusionAppendices.implementationTimeline.map((ms, idx) => (
                        <div
                          key={ms.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                        >
                          <input
                            type="text"
                            value={ms.phase}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.implementationTimeline];
                              next[idx] = { ...ms, phase: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  implementationTimeline: next,
                                },
                              }));
                            }}
                            placeholder="Phase (e.g., Phase 1: Permits & Lease)"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={ms.targetPeriod}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.implementationTimeline];
                              next[idx] = { ...ms, targetPeriod: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  implementationTimeline: next,
                                },
                              }));
                            }}
                            placeholder="Target Period (e.g., Weeks 1-2)"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={ms.responsiblePerson}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.implementationTimeline];
                              next[idx] = { ...ms, responsiblePerson: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  implementationTimeline: next,
                                },
                              }));
                            }}
                            placeholder="Responsible Lead"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={ms.deliverable}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.implementationTimeline];
                              next[idx] = { ...ms, deliverable: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  implementationTimeline: next,
                                },
                              }));
                            }}
                            placeholder="Key Deliverable"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  implementationTimeline:
                                    prev.conclusionAppendices.implementationTimeline.filter(
                                      (m) => m.id !== ms.id
                                    ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supplier Quotations Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Supplier Quotations & Equipment Estimates
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            conclusionAppendices: {
                              ...prev.conclusionAppendices,
                              supplierQuotations: [
                                ...prev.conclusionAppendices.supplierQuotations,
                                {
                                  id: makeRowId("quote"),
                                  supplierName: "",
                                  itemDescription: "",
                                  quotedAmount: 0,
                                  notes: "",
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Supplier Quote
                      </button>
                    </div>

                    <div className="space-y-2">
                      {data.conclusionAppendices.supplierQuotations.map((q, idx) => (
                        <div
                          key={q.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3"
                        >
                          <input
                            type="text"
                            value={q.supplierName}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.supplierQuotations];
                              next[idx] = { ...q, supplierName: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  supplierQuotations: next,
                                },
                              }));
                            }}
                            placeholder="Supplier Name"
                            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={q.itemDescription}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.supplierQuotations];
                              next[idx] = { ...q, itemDescription: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  supplierQuotations: next,
                                },
                              }));
                            }}
                            placeholder="Item / Equipment Quoted"
                            className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={q.quotedAmount}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.supplierQuotations];
                              next[idx] = { ...q, quotedAmount: Number(e.target.value) || 0 };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  supplierQuotations: next,
                                },
                              }));
                            }}
                            placeholder="Price (PHP)"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white text-right"
                          />
                          <input
                            type="text"
                            value={q.notes}
                            onChange={(e) => {
                              const next = [...data.conclusionAppendices.supplierQuotations];
                              next[idx] = { ...q, notes: e.target.value };
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  supplierQuotations: next,
                                },
                              }));
                            }}
                            placeholder="Warranty / Lead Time"
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                conclusionAppendices: {
                                  ...prev.conclusionAppendices,
                                  supplierQuotations:
                                    prev.conclusionAppendices.supplierQuotations.filter(
                                      (item) => item.id !== q.id
                                    ),
                                },
                              }))
                            }
                            className="sm:col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Supporting Research Notes
                      </label>
                      <textarea
                        rows={2}
                        value={data.conclusionAppendices.supportingResearch}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            conclusionAppendices: {
                              ...prev.conclusionAppendices,
                              supportingResearch: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Survey Questionnaires & Summaries
                      </label>
                      <textarea
                        rows={2}
                        value={data.conclusionAppendices.surveySummaries}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            conclusionAppendices: {
                              ...prev.conclusionAppendices,
                              surveySummaries: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Additional Tables & Appendices
                      </label>
                      <textarea
                        rows={2}
                        value={data.conclusionAppendices.additionalAppendices}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            conclusionAppendices: {
                              ...prev.conclusionAppendices,
                              additionalAppendices: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step Footer Navigation */}
              <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentStep <= 1}
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous Step
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => savePlan("DRAFT")}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    Save Progress
                  </button>
                  {currentStep < 11 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((s) => Math.min(11, s + 1))}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                    >
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Full Business Plan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
