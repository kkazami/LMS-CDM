"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  Crown,
  GraduationCap,
  Loader2,
  Lock,
  Mic,
  Receipt,
  Sparkles,
} from "lucide-react";
import {
  getFeaturesForIbeProgram,
  type IbeProgramFeature,
  type IbeStudentProgramCode,
} from "@/lib/ibe-programs/features";
import { toast } from "@/components/common/Toast";

export interface IbeProgramChoiceOption {
  id: string;
  code: IbeStudentProgramCode;
  name: string;
}

export interface IbeStudentProgramDashboardData {
  resolvedProgram: {
    code: IbeStudentProgramCode;
    name: string;
  } | null;
  availablePrograms: IbeProgramChoiceOption[];
  missingProgramCodes: IbeStudentProgramCode[];
}

interface IbeStudentProgramSectionProps {
  data: IbeStudentProgramDashboardData;
}

function getFeatureIcon(featureId: string) {
  switch (featureId) {
    case "mock-interview":
      return Mic;
    case "wordwise":
      return BookOpen;
    case "financial-statements":
      return Receipt;
    case "business-plan":
      return Briefcase;
    case "hall-of-fame":
      return Crown;
    case "learning-hub":
    default:
      return Compass;
  }
}

export default function IbeStudentProgramSection({
  data,
}: IbeStudentProgramSectionProps) {
  const router = useRouter();
  const [currentProgram, setCurrentProgram] = useState(data.resolvedProgram);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasMissingConfig = data.missingProgramCodes.length > 0;

  async function handleConfirmProgram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCode) {
      setErrorMessage("Please select your IBE academic program.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/ibe/program/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program: selectedCode }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.message || "Could not save your academic program."
        );
      }

      const saved = payload.program as {
        code: IbeStudentProgramCode;
        name: string;
      };
      setCurrentProgram(saved);
      toast.success(`Program set to ${saved.code}.`);
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not save your academic program."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── State 1: One-time "Choose your IBE program" card for existing IBE students with no program ──
  if (!currentProgram) {
    return (
      <section
        aria-labelledby="ibe-choose-program-heading"
        className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface to-surface p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  One-time setup
                </span>
              </div>
              <h2
                id="ibe-choose-program-heading"
                className="mt-1 text-lg font-bold text-primary-theme"
              >
                Choose your IBE program
              </h2>
              <p className="mt-1 text-sm text-secondary-theme leading-relaxed">
                Select your IBE degree program (BSBA HRM or BS ENTREP) to unlock
                your program-specific learning tools and resources on your
                dashboard. Once confirmed, your program is locked and can only be
                changed by an IBE administrator.
              </p>
            </div>
          </div>

          {hasMissingConfig && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Database configuration incomplete
                </p>
                <p className="mt-0.5">
                  The following required IBE program code(s) are missing from
                  the database: {data.missingProgramCodes.join(", ")}. Please
                  contact an administrator.
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleConfirmProgram}
            className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1"
          >
            <div className="flex-1">
              <label
                htmlFor="ibe-dashboard-program-select"
                className="block text-xs font-semibold text-primary-theme mb-1.5"
              >
                Select your IBE degree program
              </label>
              <select
                id="ibe-dashboard-program-select"
                value={selectedCode}
                onChange={(e) => {
                  setSelectedCode(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={submitting || hasMissingConfig}
                required
                className="w-full h-11 rounded-xl border border-theme bg-surface px-3.5 text-sm text-primary-theme outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="">Choose your program…</option>
                {data.availablePrograms.map((prog) => (
                  <option key={prog.id} value={prog.code}>
                    {prog.code} — {prog.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || hasMissingConfig || !selectedCode}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm &amp; Lock Program</span>
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <p
              role="alert"
              className="text-xs font-medium text-red-600 dark:text-red-400"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </section>
    );
  }

  // ── State 2: "Your program" panel showing only this student's IBE program features ──
  const programFeatures: IbeProgramFeature[] = getFeaturesForIbeProgram(
    currentProgram.code
  );

  return (
    <section
      aria-labelledby="ibe-your-program-heading"
      className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span id="ibe-your-program-heading">Your program</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Locked
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
            <span className="inline-flex items-center rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-extrabold tracking-wide text-white shadow-2xs">
              {currentProgram.code}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-primary-theme">
              {currentProgram.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programFeatures.map((feature) => {
          const Icon = getFeatureIcon(feature.id);

          return (
            <Link
              key={feature.id}
              href={feature.href}
              className="group relative flex flex-col justify-between rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-elevated to-elevated p-4 transition-all hover:border-amber-500/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-600"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-2xs">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Available
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary-theme group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {feature.title}
                  </h4>
                  <p className="mt-1 text-xs text-secondary-theme leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>Open {feature.title}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

