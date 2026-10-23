"use client";

import { useEffect, useState } from "react";
import type { InstituteTheme } from "@/lib/theme";
import { X, Table, Loader2, Download, Database, Layers, Eye } from "lucide-react";
import { toast } from "@/components/common/Toast";

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
  const [data, setData] = useState<{
    model: string;
    totalCount: number;
    sampleCount: number;
    columns: string[];
    rows: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "schema">("records");

  useEffect(() => {
    if (!modelName) {
      setData(null);
      return;
    }
    fetchModelData(modelName);
  }, [modelName]);

  const fetchModelData = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/database/tables/${name}`);
      if (!res.ok) throw new Error("Failed to load table details");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error("Error", `Could not inspect table ${name}.`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!modelName) return null;

  const handleExport = () => {
    window.open(`/api/admin/database/export?model=${modelName}&format=json`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 page-enter">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#141721] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-[#10131c]">
          <button
            onClick={() => setActiveTab("records")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
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
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-xs text-slate-500">Querying {modelName} records from PostgreSQL...</p>
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Table className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200">No records found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                This table currently does not contain any rows in the database.
              </p>
            </div>
          ) : activeTab === "records" ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-[#1A1D27] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    {data.columns.map((col) => (
                      <th key={col} className="p-3 border-b border-slate-200 dark:border-white/10 whitespace-nowrap">
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
                            className="p-3 max-w-xs truncate text-slate-700 dark:text-slate-300"
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
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Model Attribute Schema Columns
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.columns.map((col) => (
                  <div 
                    key={col}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-200/80 dark:border-white/5 flex items-center justify-between"
                  >
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#10131c] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Showing read-only sanitized sample data (max 25 rows)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
