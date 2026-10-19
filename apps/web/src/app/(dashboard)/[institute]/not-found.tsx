"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Compass } from "lucide-react";

export default function DashboardNotFound() {
  const params = useParams<{ institute?: string }>();
  const home = params?.institute ? `/${params.institute}` : "/";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-500 dark:text-[#94A3B8]">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8]">
          This page does not exist, or you do not have access to it.
        </p>
        <Link
          href={home}
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
