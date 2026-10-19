"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
      <div
        role="alert"
        className="w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] p-8 text-center shadow-xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8]">
          We could not load this page. Your data is safe. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-500 dark:text-[#94A3B8]">Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
