"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  FileSpreadsheet,
  ArrowRight,
  Calendar,
  Layers,
} from "lucide-react";
import { TEMPLATES } from "@/lib/financial-statements/templates";
import type { StatementType, TemplateCategory } from "@/lib/financial-statements/types";
import {
  TEMPLATE_ICONS,
  callApi,
  cardClass,
  headingText,
  inputClass,
  mutedText,
} from "./shared";
import { toast } from "@/components/common/Toast";

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  instituteCode: string;
}

const CATEGORIES: Array<"All" | TemplateCategory> = [
  "All",
  "Core Statements",
];

export default function TemplatePickerModal({
  isOpen,
  onClose,
  instituteCode,
}: TemplatePickerModalProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | TemplateCategory>("All");
  const [creatingType, setCreatingType] = useState<StatementType | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TEMPLATES.filter((tpl) => {
      const matchesCategory =
        selectedCategory === "All" || tpl.category === selectedCategory;
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.purpose.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const handleCreate = async (statementType: StatementType) => {
    if (creatingType) return;
    setCreatingType(statementType);
    try {
      const res = await callApi<{ statement: { id: string } }>("/api/financial-statements", {
        method: "POST",
        body: JSON.stringify({ statementType }),
      });
      if (!res.ok) {
        toast.error("Failed to create statement", res.message);
        setCreatingType(null);
        return;
      }
      toast.success("Draft created", "Starting your new financial statement.");
      onClose();
      router.push(`/${instituteCode}/financial-statements/${res.data.statement.id}`);
    } catch {
      toast.error("Error", "Could not start statement.");
      setCreatingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col ${cardClass} shadow-lg overflow-hidden`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-200 dark:border-white/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="template-picker-title" className={`text-base sm:text-lg font-bold ${headingText}`}>
                Choose a Financial Report Template
              </h2>
              <p className={`text-xs ${mutedText}`}>
                Select from 4 fundamental financial statement templates for your business study.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close template picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-[#10131B] shrink-0 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Search financial report templates"
              placeholder="Search templates by name, purpose, or accounting report type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10 bg-white dark:bg-[#141721]`}
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                      : "bg-white dark:bg-[#141721] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 overscroll-contain">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className={`text-sm font-semibold ${headingText}`}>No templates found</p>
              <p className={`text-xs ${mutedText} mt-1`}>
                Try adjusting your search or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const Icon = TEMPLATE_ICONS[tpl.type];
                const isSelected = creatingType === tpl.type;

                return (
                  <div
                    key={tpl.type}
                    className={`rounded-xl border-2 p-4 flex flex-col justify-between transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] hover:border-slate-300 dark:hover:border-white/25"
                    }`}
                  >
                    <div>
                      {/* Top Row: Icon + Category Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
                          {tpl.category}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className={`text-sm font-bold ${headingText} mb-1`}>
                        {tpl.name}
                      </h3>
                      <p className={`text-xs ${mutedText} line-clamp-2 leading-relaxed mb-3`}>
                        {tpl.description}
                      </p>

                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          {tpl.periodMode === "period" ? "Period Range" : "Point in Time (As-of)"}
                        </span>
                        <span>•</span>
                        <span>{tpl.sections.length} sections</span>
                      </div>

                      {/* Formulas Preview */}
                      <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                          Primary Formula
                        </p>
                        <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                          {tpl.formulas[0]}
                        </p>
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <button
                      type="button"
                      disabled={Boolean(creatingType)}
                      onClick={() => handleCreate(tpl.type)}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Creating draft...</span>
                        </>
                      ) : (
                        <>
                          <span>Use This Template</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
