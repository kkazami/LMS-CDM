"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Download,
  FileCheck2,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  Layers,
  ChevronDown,
  Building2,
  FileText,
} from "lucide-react";
import type {
  StatementData,
  StatementDetailDto,
  StatementRow,
  StatementType,
  ValidationIssue,
} from "@/lib/financial-statements/types";
import { getTemplate, newRowId } from "@/lib/financial-statements/templates";
import { buildStatement } from "@/lib/financial-statements/build";
import { validateStatement, hasBlockingErrors } from "@/lib/financial-statements/validate";
import { formatCents } from "@/lib/financial-statements/format";
import StatementReportPreview from "./StatementReportPreview";
import TemplatePickerModal from "./TemplatePickerModal";
import {
  ConfirmDialog,
  StatusBadge,
  TEMPLATE_ICONS,
  callApi,
  cardClass,
  headingText,
  inputClass,
  mutedText,
} from "./shared";
import { toast } from "@/components/common/Toast";

interface FinancialStatementEditorClientProps {
  instituteCode: string;
  initialStatement: StatementDetailDto;
  initialIssues: ValidationIssue[];
}

export default function FinancialStatementEditorClient({
  instituteCode,
  initialStatement,
  initialIssues,
}: FinancialStatementEditorClientProps) {
  const router = useRouter();
  const template = useMemo(
    () => getTemplate(initialStatement.statementType),
    [initialStatement.statementType]
  );
  const Icon = TEMPLATE_ICONS[initialStatement.statementType];

  // Editor State
  const [statement, setStatement] = useState<StatementDetailDto>(initialStatement);
  const [data, setData] = useState<StatementData>(initialStatement.data);
  const [activeView, setActiveView] = useState<"EDIT" | "PREVIEW">("EDIT");

  // Status flags
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Real-time calculation on every state update
  const buildResult = useMemo(() => {
    return buildStatement(template.type, data);
  }, [template.type, data]);

  // Real-time accounting validation issues
  const validationIssues = useMemo(() => {
    return validateStatement(template.type, data);
  }, [template.type, data]);

  const blockingErrors = useMemo(
    () => validationIssues.filter((i) => i.severity === "error"),
    [validationIssues]
  );
  const warnings = useMemo(
    () => validationIssues.filter((i) => i.severity === "warning"),
    [validationIssues]
  );

  // Update Meta Field
  const updateMeta = (field: keyof StatementData["meta"], value: string) => {
    setData((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Update Option
  const updateOption = (optionId: string, value: string) => {
    setData((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        options: {
          ...prev.meta.options,
          [optionId]: value,
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Update Cell Value
  const updateCell = (sectionId: string, rowId: string, columnId: string, value: string) => {
    setData((prev) => {
      const sectionRows = prev.sections[sectionId] || [];
      const updatedRows = sectionRows.map((r) =>
        r.id === rowId ? { ...r, values: { ...r.values, [columnId]: value } } : r
      );
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: updatedRows,
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  // Add Row to Section
  const handleAddRow = (sectionId: string) => {
    const section = template.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newRow: StatementRow = {
      id: newRowId(),
      values: Object.fromEntries(
        section.columns.filter((c) => !c.computed).map((c) => [c.id, c.kind === "select" ? c.options?.[0] || "" : ""])
      ),
    };

    setData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: [...(prev.sections[sectionId] || []), newRow],
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Remove Row from Section
  const handleRemoveRow = (sectionId: string, rowId: string) => {
    setData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: (prev.sections[sectionId] || []).filter((r) => r.id !== rowId),
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Save Draft (PATCH /api/financial-statements/[id])
  const handleSaveDraft = async (silent = false) => {
    setIsSaving(true);
    try {
      const res = await callApi<{ statement: StatementDetailDto }>(
        `/api/financial-statements/${statement.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ data }),
        }
      );

      if (!res.ok) {
        if (!silent) toast.error("Save failed", res.message);
        return false;
      }

      setStatement(res.data.statement);
      setHasUnsavedChanges(false);
      if (!silent) toast.success("Draft saved", "All entries have been safely saved.");
      return true;
    } catch {
      if (!silent) toast.error("Error", "Could not save statement draft.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Statement (POST /api/financial-statements/[id]/generate)
  const handleGenerate = async () => {
    if (blockingErrors.length > 0) {
      toast.error(
        "Cannot generate statement",
        `Please resolve the ${blockingErrors.length} required field issue(s) before generating.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      const res = await callApi<{ statement: StatementDetailDto }>(
        `/api/financial-statements/${statement.id}/generate`,
        {
          method: "POST",
          body: JSON.stringify({ data }),
        }
      );

      if (!res.ok) {
        toast.error("Generation blocked", res.message);
        return;
      }

      setStatement(res.data.statement);
      setHasUnsavedChanges(false);
      setActiveView("PREVIEW");
      toast.success(
        "Statement Generated!",
        "Your official financial statement is complete and ready to download as PDF."
      );
    } catch {
      toast.error("Error", "Could not generate statement.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset Draft to Template Defaults (POST /api/financial-statements/[id]/reset)
  const handleResetDraft = async () => {
    setIsResetting(true);
    try {
      const res = await callApi<{ statement: StatementDetailDto }>(
        `/api/financial-statements/${statement.id}/reset`,
        { method: "POST" }
      );

      if (!res.ok) {
        toast.error("Reset failed", res.message);
        return;
      }

      setStatement(res.data.statement);
      setData(res.data.statement.data);
      setHasUnsavedChanges(false);
      setIsResetModalOpen(false);
      toast.success("Draft reset", "Restored original template structure and cleared amounts.");
    } catch {
      toast.error("Error", "Could not reset draft.");
    } finally {
      setIsResetting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = () => {
    if (statement.status !== "GENERATED") {
      toast.info(
        "Generate Statement First",
        "Click 'Generate Statement' to finalize the document before downloading PDF."
      );
      return;
    }
    window.open(`/api/financial-statements/${statement.id}/pdf`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${instituteCode}/financial-statements`}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#12151E] dark:hover:bg-white/5 text-slate-600 dark:text-[#8B92A5] transition-colors"
            title="Return to My Statements"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {template.category}
              </span>
              <span>•</span>
              <StatusBadge status={statement.status} />
              {hasUnsavedChanges && (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className={`text-xl font-bold ${headingText} truncate max-w-xl`}>
              {template.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#151824] border border-slate-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={() => setActiveView("EDIT")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === "EDIT"
                  ? "bg-white dark:bg-[#1E2333] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                  : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Data</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("PREVIEW")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === "PREVIEW"
                  ? "bg-white dark:bg-[#1E2333] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                  : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Report Preview</span>
            </button>
          </div>

          {/* Reset Draft */}
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            title="Reset draft to template defaults"
            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#12151E] dark:hover:bg-white/5 text-slate-600 dark:text-[#8B92A5] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Save Draft */}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveDraft(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#12151E] dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Generate Statement */}
          <button
            type="button"
            disabled={isGenerating || blockingErrors.length > 0}
            onClick={handleGenerate}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              blockingErrors.length > 0
                ? "bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{isGenerating ? "Generating..." : "Generate Statement"}</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statement.status === "GENERATED"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "border border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#12151E] text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Real-time Validation Banner (if any errors or warnings) */}
      {validationIssues.length > 0 && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            blockingErrors.length > 0
              ? "bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-200"
              : "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {blockingErrors.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {blockingErrors.length > 0
                  ? `${blockingErrors.length} required correction(s) to generate report`
                  : `${warnings.length} accounting advisory notice(s)`}
              </h4>
              <ul className="mt-1.5 space-y-1 text-xs list-disc list-inside opacity-95">
                {validationIssues.slice(0, 4).map((issue, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {issue.message}
                  </li>
                ))}
                {validationIssues.length > 4 && (
                  <li className="text-[11px] font-semibold italic">
                    +{validationIssues.length - 4} more notices below.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Edit Mode or Preview Mode */}
      {activeView === "PREVIEW" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold ${headingText}`}>
              Live Statement Preview
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView("EDIT")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Return to Edit Data</span>
              </button>
            </div>
          </div>
          <StatementReportPreview
            document={buildResult.document}
            onDownloadPdf={handleDownloadPdf}
            canDownloadPdf={statement.status === "GENERATED"}
          />
        </div>
      ) : (
        /* Edit Data View */
        <div className="space-y-6">
          {/* Metadata Section: Business Details & Reporting Period */}
          <div className={`${cardClass} p-6 space-y-5`}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className={`text-sm font-bold ${headingText}`}>
                Business Details & Reporting Period
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Business / Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sampaguita Enterprises Inc."
                  value={data.meta.businessName}
                  onChange={(e) => updateMeta("businessName", e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Period Fields */}
              {template.periodMode === "period" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reporting Period Start <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={data.meta.periodStart}
                      onChange={(e) => updateMeta("periodStart", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reporting Period End <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={data.meta.periodEnd}
                      onChange={(e) => updateMeta("periodEnd", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Statement Date (As of Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={data.meta.asOfDate}
                    onChange={(e) => updateMeta("asOfDate", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Template Specific Options (e.g. Inventory Costing Method) */}
            {template.options && template.options.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.options.map((opt) => (
                  <div key={opt.id} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {opt.label}
                    </label>
                    <select
                      value={data.meta.options[opt.id] || opt.default}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      className={inputClass}
                    >
                      {opt.choices.map((choice) => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                    </select>
                    {opt.hint && (
                      <p className={`text-[11px] ${mutedText}`}>{opt.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sections of Financial Tables */}
          {template.sections.map((section) => {
            const rows = data.sections[section.id] || [];
            const sectionTotalCents = buildResult.sectionTotals[section.id];

            return (
              <div key={section.id} className={`${cardClass} p-5 sm:p-6 space-y-4`}>
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <h3 className={`text-sm font-bold ${headingText}`}>
                      {section.title}
                    </h3>
                    {section.hint && (
                      <p className={`text-xs ${mutedText} mt-0.5 leading-relaxed`}>
                        {section.hint}
                      </p>
                    )}
                  </div>

                  {sectionTotalCents !== undefined && (
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        Section Total:
                      </span>{" "}
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-[#F0F2F8]">
                        PHP {formatCents(sectionTotalCents)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/5">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/2 border-b border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-[#8B92A5] font-semibold">
                        {section.columns.map((col) => (
                          <th
                            key={col.id}
                            className={`p-2.5 text-left ${
                              col.kind === "money" ? "text-right" : ""
                            }`}
                          >
                            <span>{col.label}</span>
                            {col.required && !col.computed && (
                              <span className="text-rose-500 ml-0.5">*</span>
                            )}
                          </th>
                        ))}
                        <th className="p-2.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={section.columns.length + 1}
                            className="p-6 text-center text-slate-400 italic"
                          >
                            No entries in this section. Click &quot;{section.addLabel}&quot; below.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => {
                          const computedForThisRow = buildResult.rowComputed[row.id] || {};

                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/1 transition-colors"
                            >
                              {section.columns.map((col) => {
                                // Computed column: read-only
                                if (col.computed) {
                                  const computedVal = computedForThisRow[col.id] || "—";
                                  return (
                                    <td
                                      key={col.id}
                                      className={`p-2 font-mono font-medium ${
                                        col.kind === "money" ? "text-right" : ""
                                      }`}
                                    >
                                      <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200">
                                        {computedVal}
                                      </span>
                                    </td>
                                  );
                                }

                                const cellVal = row.values[col.id] ?? "";

                                if (col.kind === "select") {
                                  return (
                                    <td key={col.id} className="p-2 min-w-30">
                                      <select
                                        value={cellVal}
                                        onChange={(e) =>
                                          updateCell(section.id, row.id, col.id, e.target.value)
                                        }
                                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E1017] text-slate-900 dark:text-[#F0F2F8]"
                                      >
                                        {(col.options || []).map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  );
                                }

                                if (col.kind === "date") {
                                  return (
                                    <td key={col.id} className="p-2 min-w-35">
                                      <input
                                        type="date"
                                        value={cellVal}
                                        onChange={(e) =>
                                          updateCell(section.id, row.id, col.id, e.target.value)
                                        }
                                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E1017] text-slate-900 dark:text-[#F0F2F8]"
                                      />
                                    </td>
                                  );
                                }

                                if (col.kind === "money") {
                                  return (
                                    <td key={col.id} className="p-2 min-w-32.5">
                                      <input
                                        type="text"
                                        placeholder={col.placeholder || "0.00"}
                                        value={cellVal}
                                        onChange={(e) =>
                                          updateCell(section.id, row.id, col.id, e.target.value)
                                        }
                                        className="w-full text-xs font-mono text-right p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E1017] text-slate-900 dark:text-[#F0F2F8] focus:ring-1 focus:ring-amber-500"
                                      />
                                    </td>
                                  );
                                }

                                // Text column (labels, descriptions, codes)
                                return (
                                  <td key={col.id} className="p-2 min-w-45">
                                    <input
                                      type="text"
                                      placeholder={col.placeholder || "Account description..."}
                                      value={cellVal}
                                      onChange={(e) =>
                                        updateCell(section.id, row.id, col.id, e.target.value)
                                      }
                                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E1017] text-slate-900 dark:text-[#F0F2F8]"
                                    />
                                  </td>
                                );
                              })}

                              {/* Remove Row Button */}
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(section.id, row.id)}
                                  title="Remove row"
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddRow(section.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{section.addLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Student Explanatory Notes & Documentation */}
          <div className={`${cardClass} p-6 space-y-3`}>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className={`text-sm font-bold ${headingText}`}>
                Student Notes & Accounting Explanations (Optional)
              </h3>
            </div>
            <p className={`text-xs ${mutedText}`}>
              Add any footnotes, assumptions, depreciation methods, or transaction explanations you want to include in the generated PDF report.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Straight-line depreciation applied to office equipment. Sales returns occurred within the standard 15-day policy window."
              value={data.meta.notes}
              onChange={(e) => updateMeta("notes", e.target.value)}
              className={`${inputClass} font-sans leading-relaxed`}
            />
          </div>

          {/* Bottom Generation Action Bar */}
          <div className={`${cardClass} p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/2`}>
            <div className="text-xs text-slate-600 dark:text-[#8B92A5]">
              {blockingErrors.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ {blockingErrors.length} required field(s) require your attention before generation.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ All required fields completed. Ready to preview or generate statement.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView("PREVIEW")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#12151E] dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] text-xs font-bold transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Preview Statement</span>
              </button>
              <button
                type="button"
                disabled={isGenerating || blockingErrors.length > 0}
                onClick={handleGenerate}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  blockingErrors.length > 0
                    ? "bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-[0.98]"
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{isGenerating ? "Generating..." : "Generate Statement"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={isResetModalOpen}
        title="Reset Draft to Template Defaults?"
        description="This will restore the original account rows and clear entered amounts for this draft. Your business name and reporting period will be preserved. Other saved statements are completely unaffected."
        confirmLabel="Reset Draft"
        destructive
        busy={isResetting}
        onConfirm={handleResetDraft}
        onCancel={() => setIsResetModalOpen(false)}
      />

      {/* Template Picker Modal (Start New Statement) */}
      <TemplatePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        instituteCode={instituteCode}
      />
    </div>
  );
}
