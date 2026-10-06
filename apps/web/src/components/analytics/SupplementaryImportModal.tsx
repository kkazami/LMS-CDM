"use client";

import { useState, useRef, useEffect, useId } from "react";
import Papa from "papaparse";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import type { TaughtCourseOption } from "@/app/(dashboard)/[institute]/analytics/page";
import { triggerFileDownload } from "@/lib/analytics-export";

interface SupplementaryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  taughtCourses: TaughtCourseOption[];
  initialCourseId?: string;
  theme: InstituteTheme;
  onImportSuccess: () => void;
}

interface ParsedPreviewResult {
  identifier: string;
  matchedStudent: {
    id: string;
    name: string;
    email: string;
    studentNumber: string | null;
  } | null;
  score: number | null;
  isValid: boolean;
  error?: string;
}

interface PreviewResponse {
  courseTitle: string;
  courseCode: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  canCommit: boolean;
  results: ParsedPreviewResult[];
}

export default function SupplementaryImportModal({
  isOpen,
  onClose,
  taughtCourses,
  initialCourseId,
  theme,
  onImportSuccess,
}: SupplementaryImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseSelectId = useId();

  // Course selection (cannot be "all", must be a specific taught course)
  const defaultCourse =
    initialCourseId && initialCourseId !== "all"
      ? initialCourseId
      : taughtCourses[0]?.id || "";

  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourse);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  // Sync selected course when initialCourseId changes
  useEffect(() => {
    if (initialCourseId && initialCourseId !== "all") {
      setSelectedCourseId(initialCourseId);
    } else if (taughtCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(taughtCourses[0].id);
    }
  }, [initialCourseId, taughtCourses, selectedCourseId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setParseError(null);
      setPreviewData(null);
      setRawRows([]);
      setCommitSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generates and downloads a CSV template for the instructor
  const handleDownloadTemplate = () => {
    const templateContent =
      "studentEmail,supplementaryScore\nstudent@ics.edu.ph,85\nkazz@gmail.com,92\nshi@gmail.com,78\n";
    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    triggerFileDownload(blob, "supplementary_scores_template.csv");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please select a valid CSV file (.csv).");
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setPreviewData(null);
    setCommitSuccess(null);
    setIsParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            setParseError("The uploaded CSV file is empty.");
            setIsParsing(false);
            return;
          }

          // Normalize keys
          const normalizedRows = results.data.map((row: any) => {
            const keys = Object.keys(row);
            const emailKey = keys.find((k) =>
              /^(studentemail|email|student_email)$/i.test(k)
            );
            const numberKey = keys.find((k) =>
              /^(studentnumber|student_number|studentid|student_id|id_number)$/i.test(k)
            );
            const scoreKey = keys.find((k) =>
              /^(supplementaryscore|score|grade|supplementary_score|testscore)$/i.test(k)
            );

            return {
              studentEmail: emailKey ? row[emailKey]?.trim() : undefined,
              studentNumber: numberKey ? row[numberKey]?.trim() : undefined,
              supplementaryScore: scoreKey ? row[scoreKey]?.trim() : undefined,
            };
          });

          // Check if at least one column matches email or studentNumber, and score
          const firstRow = normalizedRows[0];
          if (!firstRow.studentEmail && !firstRow.studentNumber) {
            setParseError(
              'Missing student identifier column in CSV. Expected "studentEmail" or "studentNumber".'
            );
            setIsParsing(false);
            return;
          }
          if (firstRow.supplementaryScore === undefined) {
            setParseError(
              'Missing score column in CSV. Expected "supplementaryScore" (or "score" / "grade").'
            );
            setIsParsing(false);
            return;
          }

          setRawRows(normalizedRows);

          // Request server preview validation
          const res = await fetch("/api/analytics/supplementary-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: selectedCourseId,
              rows: normalizedRows,
              commit: false,
            }),
          });

          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.message || "Failed to validate CSV data.");
          }

          const previewResult = (await res.json()) as PreviewResponse;
          setPreviewData(previewResult);
        } catch (err) {
          setParseError(err instanceof Error ? err.message : "Error parsing CSV file.");
        } finally {
          setIsParsing(false);
        }
      },
      error: (err) => {
        setParseError(`Failed to parse CSV: ${err.message}`);
        setIsParsing(false);
      },
    });
  };

  // Re-validate if instructor changes course selector after uploading
  const handleCourseChange = async (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    if (rawRows.length > 0) {
      setIsParsing(true);
      setParseError(null);
      try {
        const res = await fetch("/api/analytics/supplementary-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: newCourseId,
            rows: rawRows,
            commit: false,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.message || "Failed to validate CSV data.");
        }

        const previewResult = (await res.json()) as PreviewResponse;
        setPreviewData(previewResult);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Error validating CSV.");
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleCommitImport = async () => {
    if (!previewData?.canCommit || rawRows.length === 0) return;

    setIsCommitting(true);
    setParseError(null);
    try {
      const res = await fetch("/api/analytics/supplementary-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          rows: rawRows,
          commit: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to commit import.");
      }

      setCommitSuccess(
        `Successfully imported ${data.importedCount} student scores into "${data.courseCode}". Risk scores have been recalculated.`
      );
      onImportSuccess();

      // Automatically close after a short delay so the instructor can see the success banner
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to commit import.");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#F0F2F8]">
                Import Supplementary Assessment
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Upload external scores to supplement student risk calculations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {commitSuccess ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                Import Complete
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {commitSuccess}
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Target Class */}
              <div className="space-y-2">
                <label
                  htmlFor={courseSelectId}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5 text-slate-500 dark:text-[#8B92A5]" />
                  Target Class Scope
                </label>
                <select
                  id={courseSelectId}
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] px-3.5 py-2 text-sm text-slate-800 dark:text-[#F0F2F8] outline-none focus:ring-2 transition-shadow"
                  style={{
                    // @ts-expect-error dynamic ring color
                    "--tw-ring-color": `${theme.colors.primary}40`,
                  }}
                >
                  {taughtCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-[#8B92A5]">
                  Student rows in the CSV will be matched against approved enrollments for this class.
                </p>
              </div>

              {/* Step 2: Upload CSV */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    CSV Data File
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-white cursor-pointer underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV Template
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-white/15 rounded-xl p-6 text-center cursor-pointer hover:border-slate-400 dark:hover:border-white/30 transition-colors bg-slate-50/50 dark:bg-white/[0.02]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud
                    className="h-9 w-9 mx-auto mb-2 text-slate-400 dark:text-slate-500"
                  />
                  <p className="text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                    {selectedFile ? selectedFile.name : "Click to select CSV file"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
                    Columns required:{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-xs">
                      studentEmail
                    </code>{" "}
                    (or{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-xs">
                      studentNumber
                    </code>
                    ) and{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-xs">
                      supplementaryScore
                    </code>{" "}
                    (0–100)
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-xs text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{parseError}</div>
                </div>
              )}

              {/* Parsing Spinner */}
              {isParsing && (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500 dark:text-[#8B92A5]">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span>Validating CSV rows against student enrollments...</span>
                </div>
              )}

              {/* Step 3: Preview Table */}
              {previewData && !isParsing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Validation Preview ({previewData.totalRows} row
                      {previewData.totalRows === 1 ? "" : "s"})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                        <CheckCircle2 className="h-3 w-3" />
                        {previewData.validCount} Valid
                      </span>
                      {previewData.invalidCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                          <AlertTriangle className="h-3 w-3" />
                          {previewData.invalidCount} Error
                          {previewData.invalidCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview status callout */}
                  {previewData.canCommit ? (
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        All student records matched successfully. Ready to import to{" "}
                        <strong>{previewData.courseCode}</strong>.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        Cannot commit while errors exist. Correct unmatched students or out-of-range scores (0–100) before confirming.
                      </span>
                    </div>
                  )}

                  {/* Rows List */}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                    {previewData.results.map((row, idx) => (
                      <div
                        key={idx}
                        className={`p-3 flex items-center justify-between gap-3 text-xs ${
                          row.isValid
                            ? "bg-white dark:bg-[#141721]"
                            : "bg-red-50/40 dark:bg-red-950/15"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                            <span className="font-medium text-slate-800 dark:text-[#F0F2F8] truncate">
                              {row.matchedStudent
                                ? `${row.matchedStudent.name} (${row.identifier})`
                                : row.identifier}
                            </span>
                          </div>
                          {!row.isValid && row.error && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5 ml-6">
                              {row.error}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`font-semibold font-mono ${
                              row.isValid
                                ? "text-slate-900 dark:text-[#F0F2F8]"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {row.score !== null ? `${row.score} / 100` : "Invalid"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#1A1D27]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!commitSuccess && (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={!previewData?.canCommit || isCommitting || isParsing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Committing to Database...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Commit Import</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
