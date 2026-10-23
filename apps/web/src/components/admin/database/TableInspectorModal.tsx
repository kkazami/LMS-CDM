"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import type { InstituteTheme } from "@/lib/theme";
import { X, Table, Loader2, Download, Database, Layers } from "lucide-react";

const inspectionSchema = z.object({
  model: z.string(),
  totalCount: z.number().int().nonnegative(),
  sampleCount: z.number().int().nonnegative(),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
});

interface TableInspectorModalProps {
  theme: InstituteTheme;
  modelName: string | null;
  onClose: () => void;
}

export function TableInspectorModal({
  theme,
  modelName,
  onClose,
}: TableInspectorModalProps) {
  const [data, setData] = useState<z.infer<typeof inspectionSchema> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [activeTab, setActiveTab] = useState<"records" | "schema">("records");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!modelName) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setData(null);
    setLoading(true);
    setError(false);
    setActiveTab("records");
    async function load() {
      try {
        const res = await fetch(`/api/admin/database/tables/${encodeURIComponent(modelName!)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load table details");
        const json = inspectionSchema.parse(await res.json());
        if (json.model !== modelName) throw new Error("Unexpected model");
        if (!controller.signal.aborted) setData(json);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [modelName, retry]);

  useEffect(() => {
    if (!modelName) return;
    const previousFocus = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [modelName, onClose]);

  if (!modelName || typeof document === "undefined") return null;

  const handleExport = () => {
    window.open(`/api/admin/database/export?model=${encodeURIComponent(modelName)}&format=json`, "_blank", "noopener,noreferrer");
  };

  // The page entrance transform would otherwise anchor this fixed overlay to the page.
  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative w-full min-w-0 max-w-6xl h-[min(54rem,calc(100dvh-3rem))] bg-white dark:bg-[#141721] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div 
              className="shrink-0 p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="break-all text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {modelName}
                </h2>
                {data && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {data.totalCount.toLocaleString()} Total Records
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prisma Model Inspection & Read-Only Record Explorer
              </p>
            </div>
          </div>

          <div className="flex shrink-0 self-end sm:self-auto items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              onClick={onClose}
              aria-label="Close table inspector"
              className="flex min-h-11 min-w-11 items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto px-3 sm:px-6 pt-3 border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-[#10131c]">
          <button
            onClick={() => setActiveTab("records")}
            aria-pressed={activeTab === "records"}
            className={`flex min-h-11 shrink-0 items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "records"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            style={activeTab === "records" ? { borderColor: theme.colors.primary, color: theme.colors.primary } : {}}
          >
            <Table className="w-4 h-4" />
            <span>Sample Records ({data?.sampleCount || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            aria-pressed={activeTab === "schema"}
            className={`flex min-h-11 shrink-0 items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "schema"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            style={activeTab === "schema" ? { borderColor: theme.colors.primary, color: theme.colors.primary } : {}}
          >
            <Layers className="w-4 h-4" />
            <span>Detected Fields ({data?.columns.length || 0})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-6" aria-busy={loading}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-xs text-slate-500">Querying {modelName} records from PostgreSQL...</p>
            </div>
          ) : error ? (
            <div role="alert" className="overflow-auto py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              <p>Could not load {modelName}. Please try again.</p>
              <button onClick={() => setRetry(value => value + 1)} className="mt-3 min-h-11 rounded-xl bg-slate-100 px-4 font-bold dark:bg-white/10">Retry</button>
            </div>
          ) : !data || (activeTab === "records" && data.rows.length === 0) ? (
            <div className="text-center py-16 space-y-2">
              <Table className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200">No records found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                This table currently does not contain any rows in the database.
              </p>
            </div>
          ) : activeTab === "records" ? (
            <div role="region" aria-label={`${modelName} sample records; scroll to see all columns`} tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-slate-200 dark:border-white/10 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
              <table className="w-max min-w-full text-left text-xs border-separate border-spacing-0">
                <thead className="bg-slate-100 dark:bg-[#1A1D27] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    {data.columns.map((col) => (
                      <th key={col} scope="col" className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1A1D27] p-3 border-b border-slate-200 dark:border-white/10 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {data.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-white/2 transition-colors">
                      {data.columns.map((col) => {
                        const val = row[col];
                        const displayVal = val === null || val === undefined 
                          ? <span className="text-slate-400 italic">null</span>
                          : String(val);

                        return (
                          <td 
                            key={col} 
                            className="p-3 max-w-xs truncate border-b border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300"
                            title={String(val ?? "")}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-0 overflow-auto overscroll-contain space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Model Attribute Schema Columns
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.columns.map((col) => (
                  <div 
                    key={col}
                    className="min-w-0 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-200/80 dark:border-white/5 flex items-center justify-between"
                  >
                    <span className="break-all font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {col}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                      Attribute
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gap-3 p-3 sm:p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#10131c] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Read-only sample (max 25 rows). Scroll the table to see all fields.</span>
          <button
            onClick={onClose}
            className="min-h-11 shrink-0 px-4 py-1.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
