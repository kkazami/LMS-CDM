"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Copy,
  Trash2,
  Download,
  Edit3,
  Clock,
  FileText,
  BookOpen,
  ArrowRight,
  Calendar,
  Layers,
  Filter,
} from "lucide-react";
import type {
  StatementStatus,
  StatementSummaryDto,
  StatementType,
  TemplateCategory,
} from "@/lib/financial-statements/types";
import { TEMPLATES, getTemplate } from "@/lib/financial-statements/templates";
import { formatCents } from "@/lib/financial-statements/format";
import TemplatePickerModal from "./TemplatePickerModal";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import {
  ConfirmDialog,
  StatusBadge,
  TEMPLATE_ICONS,
  callApi,
  cardClass,
  headingText,
  inputClass,
  mutedText,
  timeAgo,
} from "./shared";
import { toast } from "@/components/common/Toast";

interface FinancialStatementsHubClientProps {
  instituteCode: string;
  initialStatements: StatementSummaryDto[];
  studentName?: string;
}

export default function FinancialStatementsHubClient({
  instituteCode,
  initialStatements,
  studentName,
}: FinancialStatementsHubClientProps) {
  const router = useRouter();
  const [statements, setStatements] = useState<StatementSummaryDto[]>(initialStatements);
  const [activeTab, setActiveTab] = useState<"STATEMENTS" | "TEMPLATES">("STATEMENTS");

  // Filter state for My Statements
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | StatementStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | StatementType>("ALL");

  // Filter state for Template Gallery
  const [tplCategory, setTplCategory] = useState<"All" | TemplateCategory>("All");

  // Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StatementSummaryDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [startingType, setStartingType] = useState<StatementType | null>(null);

  // Filtered Statements
  const filteredStatements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return statements.filter((s) => {
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      const matchesType = typeFilter === "ALL" || s.statementType === typeFilter;
      const tpl = getTemplate(s.statementType);
      const matchesSearch =
        !q ||
        s.templateName.toLowerCase().includes(q) ||
        s.businessName.toLowerCase().includes(q) ||
        tpl.name.toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [statements, search, statusFilter, typeFilter]);

  // Summary Counters
  const counts = useMemo(() => {
    const total = statements.length;
    const drafts = statements.filter((s) => s.status === "DRAFT").length;
    const generated = statements.filter((s) => s.status === "GENERATED").length;
    return { total, drafts, generated };
  }, [statements]);

  // Duplicate Statement
  const handleDuplicate = async (stmt: StatementSummaryDto) => {
    if (duplicatingId) return;
    setDuplicatingId(stmt.id);
    try {
      const res = await callApi<{ statement: StatementSummaryDto }>(
        `/api/financial-statements/${stmt.id}/duplicate`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.error("Failed to duplicate", res.message);
        return;
      }
      setStatements((prev) => [res.data.statement, ...prev]);
      toast.success(
        "Statement duplicated",
        `Created copy of "${res.data.statement.businessName || res.data.statement.templateName}".`
      );
    } catch {
      toast.error("Error", "Could not duplicate statement.");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Delete Statement
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await callApi<{ deleted: boolean }>(
        `/api/financial-statements/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed to delete", res.message);
        return;
      }
      setStatements((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(
        "Statement deleted",
        `"${deleteTarget.businessName || deleteTarget.templateName}" was removed.`
      );
      setDeleteTarget(null);
    } catch {
      toast.error("Error", "Could not delete statement.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick-start from Template Gallery
  const handleQuickStart = async (statementType: StatementType) => {
    if (startingType) return;
    setStartingType(statementType);
    try {
      const res = await callApi<{ statement: { id: string } }>("/api/financial-statements", {
        method: "POST",
        body: JSON.stringify({ statementType }),
      });
      if (!res.ok) {
        toast.error("Failed to create draft", res.message);
        setStartingType(null);
        return;
      }
      toast.success("Draft created", "Opening the financial statement editor...");
      router.push(`/${instituteCode}/financial-statements/${res.data.statement.id}`);
    } catch {
      toast.error("Error", "Could not create statement draft.");
      setStartingType(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Compact Header + Flat Stat Strip */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${headingText}`}>
                Financial Statement Generator
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                4 Accounting Templates
              </span>
            </div>
            <p className={`text-xs sm:text-sm ${mutedText} max-w-2xl leading-relaxed`}>
              {studentName ? (
                <>
                  Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{studentName}</span>.{" "}
                </>
              ) : null}
              Prepare, validate, and export financial statements with automatic accounting equations, Philippine Peso formatting, and printable PDF reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "STATEMENTS" ? "TEMPLATES" : "STATEMENTS")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              {activeTab === "STATEMENTS" ? "Template Gallery (4)" : `My Statements (${counts.total})`}
            </button>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Financial Statement
            </button>
          </div>
        </div>

        {/* Flat 4-Column Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x-2 border-t-2 border-slate-200 dark:border-white/15 divide-slate-200 dark:divide-white/15 bg-slate-50/70 dark:bg-[#10131B]">
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Statements
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {counts.total}
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Working Drafts
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {counts.drafts}
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6 border-t-2 sm:border-t-0 border-slate-200 dark:border-white/15">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Generated Reports
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {counts.generated}
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6 border-t-2 sm:border-t-0 border-slate-200 dark:border-white/15">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Core Templates
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {TEMPLATES.length}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Underline Tabs */}
      <div className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("STATEMENTS")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "STATEMENTS"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Statements ({counts.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TEMPLATES")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === "TEMPLATES"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Template Gallery ({TEMPLATES.length})</span>
        </button>
      </div>

      {/* Tab Content 1: MY STATEMENTS */}
      {activeTab === "STATEMENTS" && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className={`${cardClass} p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3`}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="Search financial statements"
                placeholder="Search by business name or template type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:inline" />
                <ResponsiveSelect<"ALL" | StatementStatus>
                  ariaLabel="Filter by status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="w-full md:w-40"
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "DRAFT", label: "Draft Only" },
                    { value: "GENERATED", label: "Generated Only" },
                  ]}
                />
              </div>

              <ResponsiveSelect<"ALL" | StatementType>
                ariaLabel="Filter by template type"
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-full md:w-64"
                align="right"
                options={[
                  { value: "ALL", label: "All Report Types (4)" },
                  ...TEMPLATES.map((t) => ({ value: t.type, label: t.name })),
                ]}
              />
            </div>
          </div>

          {/* Statements List or Empty State */}
          {filteredStatements.length === 0 ? (
            <div className={`${cardClass} p-10 text-center`}>
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-white/5 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className={`text-base font-bold ${headingText}`}>
                {statements.length === 0
                  ? "No financial statements yet"
                  : "No matching statements found"}
              </h2>
              <p className={`text-xs ${mutedText} max-w-md mx-auto mt-1 mb-5 leading-relaxed`}>
                {statements.length === 0
                  ? "Choose from 4 structured templates (Income Statement, Balance Sheet, Cash Flow, and Owner's Equity) to start building your report."
                  : "Try clearing your search or status filter to view all your saved statements."}
              </p>

              {statements.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Statement</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setTypeFilter("ALL");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStatements.map((stmt) => {
                const tpl = getTemplate(stmt.statementType);
                const Icon = TEMPLATE_ICONS[stmt.statementType];
                const isDuplicating = duplicatingId === stmt.id;

                return (
                  <div
                    key={stmt.id}
                    className={`${cardClass} p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/25 transition-colors`}
                  >
                    <div>
                      {/* Top Row: Icon, Type Badge, Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block truncate">
                              {tpl.name}
                            </span>
                            <h3 className={`text-sm font-bold ${headingText} truncate`}>
                              {stmt.businessName || "Untitled Business"}
                            </h3>
                          </div>
                        </div>

                        <StatusBadge status={stmt.status} />
                      </div>

                      {/* Business & Period Metadata */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 mb-4 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Reporting Period
                          </p>
                          <p className={`font-semibold ${headingText} truncate mt-0.5 font-mono text-[11px]`}>
                            {stmt.periodLabel || "— Not set —"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {stmt.headline ? stmt.headline.label : "Key Metric"}
                          </p>
                          <p className={`font-semibold ${headingText} truncate mt-0.5 font-mono text-[11px]`}>
                            {stmt.headline ? `PHP ${formatCents(stmt.headline.cents)}` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Timestamp & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${mutedText}`}>
                        <Clock className="w-3.5 h-3.5" />
                        Updated {timeAgo(stmt.updatedAt)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Edit / Open */}
                        <Link
                          href={`/${instituteCode}/financial-statements/${stmt.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-xs font-semibold transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{stmt.status === "GENERATED" ? "View / Edit" : "Continue"}</span>
                        </Link>

                        {/* Download PDF (only if GENERATED) */}
                        {stmt.status === "GENERATED" && (
                          <a
                            href={`/api/financial-statements/${stmt.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </a>
                        )}

                        {/* Duplicate */}
                        <button
                          type="button"
                          disabled={isDuplicating}
                          onClick={() => handleDuplicate(stmt)}
                          title="Duplicate Statement"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(stmt)}
                          title="Delete Statement"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: TEMPLATE GALLERY & LEARNING GUIDE */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                "All",
                "Core Statements",
              ] as const
            ).map((cat) => {
              const active = tplCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTplCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                      : "bg-white dark:bg-[#141721] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.filter((t) => tplCategory === "All" || t.category === tplCategory).map(
              (tpl) => {
                const Icon = TEMPLATE_ICONS[tpl.type];
                const isStarting = startingType === tpl.type;

                return (
                  <div
                    key={tpl.type}
                    className={`${cardClass} p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/25 transition-colors`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
                          {tpl.category}
                        </span>
                      </div>

                      <h3 className={`text-base font-bold ${headingText} mb-1`}>{tpl.name}</h3>
                      <p className={`text-xs ${mutedText} leading-relaxed mb-4`}>
                        {tpl.description}
                      </p>

                      {/* Educational Purpose Box */}
                      <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                          Educational Purpose
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {tpl.purpose}
                        </p>
                      </div>

                      {/* Key Accounting Formulas */}
                      <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 mb-4 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Built-in Accounting Equations
                        </p>
                        {tpl.formulas.map((f, idx) => (
                          <p
                            key={idx}
                            className="text-[11px] font-mono text-slate-700 dark:text-slate-300"
                          >
                            • {f}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                      <div className={`flex items-center gap-3 text-[11px] font-mono ${mutedText}`}>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          {tpl.periodMode === "period" ? "Period Range" : "As-of Date"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-500" />
                          {tpl.sections.length} Sections
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(startingType)}
                        onClick={() => handleQuickStart(tpl.type)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>{isStarting ? "Starting..." : "Start Draft"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        instituteCode={instituteCode}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Financial Statement?"
        description={
          deleteTarget ? (
            <>
              Are you sure you want to permanently delete{" "}
              <strong className={headingText}>
                {deleteTarget.businessName || deleteTarget.templateName}
              </strong>
              ? This action cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete Statement"
        destructive
        busy={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
