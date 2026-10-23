"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, NotebookPen, Plus, Search } from "lucide-react";
import type { PlacementDTO } from "@/lib/practicum/dto";
import AddPlacementDialog from "./AddPlacementDialog";
import { PlacementStatusBadge } from "./StatusBadges";
import { formatDate } from "./shared";

interface SupervisorPracticumClientProps {
  instituteCode: string;
  placements: PlacementDTO[];
  primaryColor: string;
}

export default function SupervisorPracticumClient({
  instituteCode,
  placements,
  primaryColor,
}: SupervisorPracticumClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [adding, setAdding] = useState(false);

  const totalAwaiting = placements.reduce((sum, p) => sum + p.pendingReview, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return placements.filter((p) => {
      if (needsReviewOnly && p.pendingReview === 0) return false;
      if (!q) return true;
      return [p.studentName, p.schoolName, p.subject, p.gradeLevel].some((v) => v.toLowerCase().includes(q));
    });
  }, [placements, search, needsReviewOnly]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8] sm:text-2xl">Practicum</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-[#94A3B8]">
            Student teachers you supervise.{" "}
            <span className="font-mono tabular-nums">{totalAwaiting}</span> submission{totalAwaiting === 1 ? "" : "s"} awaiting review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add placement
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[#94A3B8]"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, school or subject"
            aria-label="Search placements"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/15 dark:bg-[#1E2132] dark:text-[#F0F2F8] dark:placeholder:text-[#94A3B8]"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={needsReviewOnly}
          onClick={() => setNeedsReviewOnly((v) => !v)}
          className={`min-h-11 cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold ${
            needsReviewOnly
              ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
          }`}
        >
          Needs review
        </button>
      </div>

      {placements.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-white/10 dark:bg-[#141721]">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
          >
            <NotebookPen className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">You are not supervising anyone yet.</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-[#94A3B8]">Use “Add placement” to assign a student teacher.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-700 dark:text-[#94A3B8]">No placements match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${instituteCode}/practicum/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#141721] dark:hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{p.studentName}</p>
                    <PlacementStatusBadge status={p.status} />
                    {p.pendingReview > 0 && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        {p.pendingReview} awaiting review
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-700 dark:text-[#94A3B8]">
                    {p.schoolName} · {p.subject} · {p.gradeLevel} · {p.schoolYear}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddPlacementDialog
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
