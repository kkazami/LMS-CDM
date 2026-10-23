"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "@/components/common/Toast";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { StudentPickerOption } from "@/lib/practicum/dto";
import { practicumFetch } from "./shared";

interface AddPlacementDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/** Philippine school years start in June: suggest "2025-2026" style from today's date. */
function suggestedSchoolYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

export default function AddPlacementDialog({ onClose, onCreated }: AddPlacementDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const requestClose = () => {
    if (!saving) onClose();
  };
  useDialogA11y(true, requestClose, panelRef);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudentPickerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentPickerOption | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [schoolYear, setSchoolYear] = useState(suggestedSchoolYear);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Debounced search against real ITE students (id and name only).
  useEffect(() => {
    if (student) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/practicum/ite-students?search=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Could not load students.");
        const data = (await res.json()) as { students: StudentPickerOption[] };
        setOptions(data.students);
      } catch (err) {
        if (!controller.signal.aborted) {
          setOptions([]);
          setError(err instanceof Error ? err.message : "Could not load students.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, student]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    if (!student) {
      setError("Choose a student teacher.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Enter the start and end dates.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSaving(true);
    try {
      await practicumFetch("/api/practicum/placements", {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          schoolName,
          subject,
          gradeLevel,
          schoolYear,
          startDate,
          endDate,
        }),
      });
      toast.success("Placement added", `${student.name} can now submit practicum work.`);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the placement.");
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
        aria-labelledby="add-placement-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#141721] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 id="add-placement-title" className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            Add placement
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

        <form onSubmit={submit} className="space-y-4 overflow-y-auto px-5 py-4">
          {/* Student picker */}
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">Student teacher</span>
            {student ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-300 px-3 py-2 dark:border-white/15">
                <span className="text-sm font-medium text-slate-900 dark:text-[#F0F2F8]">{student.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStudent(null);
                    setQuery("");
                  }}
                  className="cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[#94A3B8]"
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="Search ITE students by name"
                    aria-label="Search ITE students by name"
                    autoComplete="off"
                  />
                </div>
                <ul
                  aria-label="Matching students"
                  className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10"
                >
                  {searching && (
                    <li className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-[#94A3B8]">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…
                    </li>
                  )}
                  {!searching && options.length === 0 && (
                    <li className="px-3 py-2 text-sm text-slate-600 dark:text-[#94A3B8]">No ITE students found.</li>
                  )}
                  {options.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => setStudent(option)}
                        className="w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50 dark:text-[#F0F2F8] dark:hover:bg-white/5"
                      >
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="pl-school" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                School name
              </label>
              <input id="pl-school" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={inputClass} maxLength={200} required />
            </div>
            <div>
              <label htmlFor="pl-subject" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                Subject
              </label>
              <input id="pl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} maxLength={120} required />
            </div>
            <div>
              <label htmlFor="pl-grade" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                Grade level
              </label>
              <input id="pl-grade" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className={inputClass} maxLength={60} required />
            </div>
            <div>
              <label htmlFor="pl-year" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                School year
              </label>
              <input id="pl-year" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className={inputClass} pattern="\d{4}-\d{4}" placeholder="2025-2026" required />
            </div>
            <div className="hidden sm:block" />
            <div>
              <label htmlFor="pl-start" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                Start date
              </label>
              <input id="pl-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label htmlFor="pl-end" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                End date
              </label>
              <input id="pl-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputClass} required />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
              Add placement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
