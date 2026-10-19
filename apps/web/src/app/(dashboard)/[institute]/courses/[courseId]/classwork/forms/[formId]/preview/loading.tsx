export default function FormPreviewLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] pb-24">
      <div className="sticky top-0 z-50 bg-amber-500/80 text-white text-xs font-semibold py-2.5 px-4 text-center animate-pulse">
        Loading assessment preview...
      </div>
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-6 sm:p-8 space-y-4">
          <div className="h-7 w-3/4 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
        </div>
        {[1, 2].map((n) => (
          <div
            key={n}
            className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-5 sm:p-7 space-y-4"
          >
            <div className="h-5 w-3/5 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map((opt) => (
                <div key={opt} className="h-10 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
