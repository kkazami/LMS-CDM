'use client';
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#141721]">
    <h2 className="text-xl font-semibold">This page could not load</h2>
    <p className="my-4 text-sm text-slate-600 dark:text-slate-300">Your saved work is still available. Try loading this page again.</p>
    <button onClick={reset} className="min-h-11 rounded-xl bg-orange-600 px-5 py-2 text-white">Try again</button>
  </section>;
}
