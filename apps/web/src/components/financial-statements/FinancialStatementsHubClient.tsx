"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Sparkles,
  Download,
  Copy,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  FileText,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import type { StatementSummaryDto, StatementType, TemplateCategory } from "@/lib/financial-statements/types";
import { TEMPLATES } from "@/lib/financial-statements/templates";
import { formatCents } from "@/lib/financial-statements/format";
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
  timeAgo,
} from "./shared";
import { toast } from "@/components/common/Toast";

interface FinancialStatementsHubClientProps {
  instituteCode: string;
  initialStatements: StatementSummaryDto[];
  studentName: string;
}

type TabKey = "ALL" | "DRAFTS" | "GENERATED" | "TEMPLATES";

export default function FinancialStatementsHubClient({
  instituteCode,
  initialStatements,
  studentName,
}: FinancialStatementsHubClientProps) {
  const router = useRouter();
  const [statements, setStatements] = useState<StatementSummaryDto[]>(initialStatements);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [search, setSearch] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Modal dialog states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Filtered statements
  const filteredStatements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return statements.filter((stmt) => {
      const matchesTab =
        activeTab === "ALL" ||
        (activeTab === "DRAFTS" && stmt.status === "DRAFT") ||
        (activeTab === "GENERATED" && stmt.status === "GENERATED");
      const matchesSearch =
        !q ||
        stmt.templateName.toLowerCase().includes(q) ||
        stmt.businessName.toLowerCase().includes(q) ||
        stmt.periodLabel.toLowerCase().includes(q) ||
        stmt.category.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [statements, activeTab, search]);

  const counts = useMemo(() => {
    return {
      all: statements.length,
      drafts: statements.filter((s) => s.status === "DRAFT").length,
      generated: statements.filter((s) => s.status === "GENERATED").length,
    };
  }, [statements]);

  // Actions
  const handleDuplicate = async (id: string) => {
    if (duplicatingId) return;
    setDuplicatingId(id);
    try {
      const res = await callApi<{ statement: StatementSummaryDto }>(
        `/api/financial-statements/${id}/duplicate`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.error("Duplicate failed", res.message);
        return;
      }
      toast.success("Statement duplicated", "Created a new draft copy.");
      setStatements((prev) => [res.data.statement, ...prev]);
    } catch {
      toast.error("Error", "Could not duplicate statement.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await callApi(`/api/financial-statements/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Delete failed", res.message);
        return;
      }
      toast.success("Statement deleted", "The report draft was permanently removed.");
      setStatements((prev) => prev.filter((s) => s.id !== deletingId));
      setDeletingId(null);
    } catch {
      toast.error("Error", "Could not delete statement.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/financial-statements/${id}/pdf`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className={`${cardClass} p-6 sm:p-8 bg-linear-to-br from-white via-white to-amber-500/5 dark:from-[#12151E] dark:via-[#12151E] dark:to-amber-500/5`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>IBE Student Accounting Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight">
              Financial Statement Generator
            </h1>
            <p className="text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed">
              Create, edit, and manage your financial reports. Choose from 10 standardized accounting templates, enter your accounts, verify automated calculations, preview, and download official PDF statements.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Statement</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-200/80 dark:border-white/5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#555C72]">
              Total Reports
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {counts.all}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Saved Drafts
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {counts.drafts}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Generated Statements
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {counts.generated}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Available Templates
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              10
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#151824] border border-slate-200/80 dark:border-white/5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-white dark:bg-[#1E2333] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            Recently Updated Reports ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DRAFTS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "DRAFTS"
                ? "bg-white dark:bg-[#1E2333] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            Saved Drafts ({counts.drafts})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("GENERATED")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "GENERATED"
                ? "bg-white dark:bg-[#1E2333] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            Generated Statements ({counts.generated})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TEMPLATES")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "TEMPLATES"
                ? "bg-white dark:bg-[#1E2333] text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            Template Categories
          </button>
        </div>

        {/* Search Input (only shown when looking at statements) */}
        {activeTab !== "TEMPLATES" && (
          <div className="relative min-w-65">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10 text-xs`}
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "TEMPLATES" ? (
        /* Direct Template Explorer Section */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold ${headingText}`}>
              Explore All 10 Accounting Report Templates
            </h2>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
            >
              Open Quick Picker
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.type];
              return (
                <div
                  key={tpl.type}
                  className={`${cardClass} p-5 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all group`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]">
                        {tpl.category}
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold ${headingText} mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors`}>
                      {tpl.name}
                    </h3>
                    <p className={`text-xs ${mutedText} line-clamp-2 leading-relaxed mb-4`}>
                      {tpl.description}
                    </p>

                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 mb-4 text-[11px]">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {tpl.periodMode === "period" ? "Period Statement" : "As-of Date Statement"}
                      </p>
                      <p className="text-slate-500 dark:text-[#8B92A5] font-mono text-[10px] truncate">
                        {tpl.formulas[0]}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await callApi<{ statement: { id: string } }>("/api/financial-statements", {
                        method: "POST",
                        body: JSON.stringify({ statementType: tpl.type }),
                      });
                      if (res.ok) {
                        router.push(`/${instituteCode}/financial-statements/${res.data.statement.id}`);
                      } else {
                        toast.error("Failed to create", res.message);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Start Report</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredStatements.length === 0 ? (
        /* Empty State */
        <div className={`${cardClass} p-12 text-center space-y-4`}>
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <FolderOpen className="w-8 h-8 opacity-75" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className={`text-base font-bold ${headingText}`}>
              {search
                ? "No matching financial statements"
                : activeTab === "DRAFTS"
                ? "No saved drafts"
                : activeTab === "GENERATED"
                ? "No generated statements yet"
                : "No financial statements created yet"}
            </h3>
            <p className={`text-xs ${mutedText} leading-relaxed`}>
              {search
                ? `No reports found matching "${search}". Try searching for another keyword or clear the filter.`
                : "Start by selecting an accounting report template to record your business figures and generate PDF reports."}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Statement</span>
            </button>
          </div>
        </div>
      ) : (
        /* Statement Grid List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStatements.map((stmt) => {
            const Icon = TEMPLATE_ICONS[stmt.statementType];
            const isGenerated = stmt.status === "GENERATED";

            return (
              <div
                key={stmt.id}
                onClick={() => router.push(`/${instituteCode}/financial-statements/${stmt.id}`)}
                className={`${cardClass} p-5 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group`}
              >
                <div>
                  {/* Top Bar: Icon + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <StatusBadge status={stmt.status} />
                  </div>

                  {/* Title & Business Name */}
                  <h3 className={`text-sm font-bold ${headingText} group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-0.5`}>
                    {stmt.templateName}
                  </h3>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mb-3">
                    {stmt.businessName || "(Untitled Business)"}
                  </p>

                  {/* Period Label */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#8B92A5] mb-3">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{stmt.periodLabel || "Period not set"}</span>
                  </div>

                  {/* Headline Metric if Available */}
                  {stmt.headline && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5 mb-4 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8B92A5]">
                        {stmt.headline.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-[#F0F2F8]">
                        PHP {formatCents(stmt.headline.cents)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer with Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-[#555C72]">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(stmt.updatedAt)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {isGenerated && (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(stmt.id, e)}
                        title="Download PDF"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={duplicatingId === stmt.id}
                      onClick={() => handleDuplicate(stmt.id)}
                      title="Duplicate as new draft"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(stmt.id)}
                      title="Delete statement"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/${instituteCode}/financial-statements/${stmt.id}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 dark:hover:text-amber-400 transition-colors"
                      title="Open / Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        instituteCode={instituteCode}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Financial Statement?"
        description="Are you sure you want to delete this financial statement? This action cannot be undone and any unsaved entries or generated reports will be permanently deleted."
        confirmLabel="Delete Statement"
        destructive
        busy={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
