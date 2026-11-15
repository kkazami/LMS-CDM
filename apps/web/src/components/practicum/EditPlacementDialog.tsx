"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "@/components/common/Toast";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { PlacementDTO } from "@/lib/practicum/dto";
import {
  RUBRIC_EXTENSIONS,
  RUBRIC_HINT_TEXT,
  RUBRIC_MIME_BY_EXTENSION,
  formatBytes,
  getExtension,
  validateRubricUpload,
  type RubricExtension,
} from "@/lib/practicum/rules";
import { toDateInputValue } from "./shared";

interface EditPlacementDialogProps {
  placement: PlacementDTO;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export default function EditPlacementDialog({ placement, onClose, onSaved }: EditPlacementDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const rubricInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const requestClose = () => {
    if (!saving) onClose();
  };
  useDialogA11y(true, requestClose, panelRef);

  const [schoolName, setSchoolName] = useState(placement.schoolName);
  const [subject, setSubject] = useState(placement.subject);
  const [gradeLevel, setGradeLevel] = useState(placement.gradeLevel);
  const [startDate, setStartDate] = useState(() => toDateInputValue(placement.startDate));
  const [endDate, setEndDate] = useState(() => toDateInputValue(placement.endDate));

  const [newRubricFile, setNewRubricFile] = useState<File | null>(null);
  const [removeExistingRubric, setRemoveExistingRubric] = useState(false);
  const [rubricError, setRubricError] = useState<string | null>(null);
  const [draggingRubric, setDraggingRubric] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rubricAcceptAttr = RUBRIC_EXTENSIONS.map((ext) => `.${ext}`).join(",");
  const hasCurrentRubric = Boolean(placement.rubricFileName && placement.rubricUrl) && !removeExistingRubric && !newRubricFile;

  function handleSelectedRubric(picked: File | null) {
    setRubricError(null);
    if (!picked) {
      setNewRubricFile(null);
      return;
    }
    const ext = getExtension(picked.name) as RubricExtension;
    const rawMime = (picked.type || "").trim().toLowerCase().split(";")[0];
    const effectiveMime =
      !rawMime || rawMime === "application/octet-stream"
        ? RUBRIC_MIME_BY_EXTENSION[ext] ?? rawMime
        : rawMime;

    const check = validateRubricUpload(picked.name, effectiveMime || null, picked.size);
    if (!check.ok) {
      setNewRubricFile(null);
      setRubricError(check.reason);
      if (rubricInputRef.current) rubricInputRef.current.value = "";
      return;
    }
    setNewRubricFile(picked);
    setRemoveExistingRubric(false);
  }

  function clearSelectedNewRubric() {
    setNewRubricFile(null);
    setRubricError(null);
    if (rubricInputRef.current) rubricInputRef.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    if (!startDate || !endDate) {
      setError("Enter the start and end dates.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }
    if (rubricError) {
      setError(rubricError);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("schoolName", schoolName);
      formData.append("subject", subject);
      formData.append("gradeLevel", gradeLevel);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      if (newRubricFile) {
        formData.append("rubric", newRubricFile);
      } else if (removeExistingRubric) {
        formData.append("removeRubric", "true");
      }

      const response = await fetch(`/api/practicum/placements/${encodeURIComponent(placement.id)}`, {
        method: "PATCH",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update the placement.");
      }

      toast.success("Placement updated");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the placement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-placement-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#141721] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 id="edit-placement-title" className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            Edit placement
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-[#94A3B8] dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Fields marked with <span className="text-rose-500" aria-hidden="true">*</span> are required.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">Student teacher</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-[#181B26] dark:text-[#D1D5DB]">
                  {placement.studentName}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">School year</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-[#181B26] dark:text-[#D1D5DB]">
                  {placement.schoolYear}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="edit-pl-school" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  School name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-pl-school"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={inputClass}
                  maxLength={200}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="edit-pl-subject" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  Subject <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-pl-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                  maxLength={120}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="edit-pl-grade" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  Grade level <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-pl-grade"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className={inputClass}
                  maxLength={60}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="edit-pl-start" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  Start date <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-pl-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="edit-pl-end" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  End date <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="edit-pl-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            {/* Rubric file (optional) */}
            <div>
              <label htmlFor="edit-pl-rubric" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                Rubric file <span className="font-normal text-slate-600 dark:text-[#94A3B8]">(optional)</span>
              </label>

              {newRubricFile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-white/15 dark:bg-[#1E2132]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-[#F0F2F8]">{newRubricFile.name}</p>
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{formatBytes(newRubricFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedNewRubric}
                    disabled={saving}
                    className="shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:bg-[#141721] dark:text-[#F0F2F8] dark:hover:bg-white/10"
                  >
                    Remove
                  </button>
                </div>
              ) : hasCurrentRubric ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-white/15 dark:bg-[#1E2132]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-[#F0F2F8]">
                        {placement.rubricFileName}
                      </p>
                      {placement.rubricFileSize ? (
                        <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                          {formatBytes(placement.rubricFileSize)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rubricInputRef.current?.click()}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-white/15 dark:bg-[#141721] dark:text-[#F0F2F8] dark:hover:bg-white/10"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveExistingRubric(true);
                        setRubricError(null);
                      }}
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/20 disabled:opacity-50 dark:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="edit-pl-rubric"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!saving) setDraggingRubric(true);
                  }}
                  onDragLeave={() => setDraggingRubric(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggingRubric(false);
                    if (saving) return;
                    const dropped = e.dataTransfer.files?.[0] ?? null;
                    handleSelectedRubric(dropped);
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-3.5 text-center transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                    draggingRubric
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-300 bg-white hover:bg-slate-50 dark:border-white/15 dark:bg-[#1E2132] dark:hover:bg-white/5"
                  }`}
                >
                  <UploadCloud className="h-5 w-5 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                    Choose a rubric file or drag and drop
                  </span>
                  <span className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    {RUBRIC_HINT_TEXT}
                  </span>
                </label>
              )}

              <input
                ref={rubricInputRef}
                id="edit-pl-rubric"
                type="file"
                accept={rubricAcceptAttr}
                onChange={(e) => handleSelectedRubric(e.target.files?.[0] ?? null)}
                disabled={saving}
                className="sr-only"
              />

              {rubricError && (
                <p
                  role="alert"
                  className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                >
                  {rubricError}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-[#141721] sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

