"use client";

import { useState } from "react";
import { X, Upload, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface BulkImportModalProps {
  open: boolean;
  theme: InstituteTheme;
  instituteCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface BulkResult {
  email: string;
  success: boolean;
  error?: string;
  temporaryPassword?: string;
}

type Stage = "input" | "preview" | "results";

export default function BulkImportModal({
  open,
  theme,
  instituteCode,
  onClose,
  onSuccess,
}: BulkImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ total: 0, created: 0, failed: 0 });

  if (!open) return null;

  function handleReset() {
    setCsvText("");
    setStage("input");
    setParsedRows([]);
    setResults([]);
    setError("");
    setSummary({ total: 0, created: 0, failed: 0 });
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handlePreview() {
    setError("");

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setError("CSV must contain a header row and at least one data row.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    if (!headers.includes("name") || !headers.includes("email")) {
      setError('CSV headers must include "name" and "email" columns.');
      return;
    }

    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ?? "";
      }
      rows.push(row);
    }

    setParsedRows(rows);
    setStage("preview");
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const users = parsedRows.map((row) => ({
        name: row.name,
        email: row.email,
        uniqueId: row.uniqueid || row.uniqueId || row["unique_id"] || row["student_number"] || row["employee_id"] || "",
        role: row.role || "STUDENT",
      }));

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users, instituteCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResults(data.results);
      setSummary(data.summary);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" style={{ color: theme.colors.primary }} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Bulk User Import</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Stage: Input */}
          {stage === "input" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold">CSV Format Required</p>
                <p className="mt-1">Headers: <code className="rounded bg-blue-500/20 px-1 py-0.5 font-mono">name,email,uniqueId,role</code></p>
                <p className="mt-1">Roles: STUDENT, INSTRUCTOR, ADMIN. Default is STUDENT if omitted.</p>
              </div>

              {/* File upload */}
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs">
                  <FileText className="h-4 w-4" />
                  Upload CSV File
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400 dark:text-[#8B92A5]">or paste below</span>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`name,email,uniqueId,role\nJohn Doe,john@school.edu,2024-001,STUDENT\nJane Smith,jane@school.edu,EMP-042,INSTRUCTOR`}
                rows={10}
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-50/50 dark:bg-[#1E2132] p-3 font-mono text-xs text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
              />

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!csvText.trim()}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {/* Stage: Preview */}
          {stage === "preview" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-[#8B92A5]">
                Review <strong className="text-slate-900 dark:text-[#F0F2F8]">{parsedRows.length}</strong> rows before importing:
              </p>

              <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#181B26] sticky top-0 border-b border-slate-200/80 dark:border-white/5">
                    <tr>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">#</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Name</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Email</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">ID</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium text-slate-800 dark:text-[#F0F2F8]">{row.name || "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-[#8B92A5]">{row.email || "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-[#8B92A5]">
                          {row.uniqueid || row.uniqueId || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-[#8B92A5] uppercase font-semibold">
                          {row.role || "STUDENT"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStage("input")}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2132] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {loading ? "Importing..." : `Import ${parsedRows.length} Users`}
                </button>
              </div>
            </div>
          )}

          {/* Stage: Results */}
          {stage === "results" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">{summary.total}</p>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5]">Total</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.created}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Created</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.failed}</p>
                  <p className="text-xs text-red-500 dark:text-red-400">Failed</p>
                </div>
              </div>

              {/* Results list */}
              <div className="max-h-[250px] overflow-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#181B26] sticky top-0 border-b border-slate-200/80 dark:border-white/5">
                    <tr>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Status</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Email</th>
                      <th className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2">
                          {r.success ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-slate-800 dark:text-[#F0F2F8]">{r.email}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.success ? (
                            <span className="text-slate-500 dark:text-[#8B92A5]">
                              Temp pass: <code className="rounded bg-slate-100 dark:bg-white/10 px-1 py-0.5 font-mono">{r.temporaryPassword}</code>
                            </span>
                          ) : (
                            <span className="text-red-500 dark:text-red-400">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    handleReset();
                    onSuccess(`${summary.created} users imported successfully.`);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
