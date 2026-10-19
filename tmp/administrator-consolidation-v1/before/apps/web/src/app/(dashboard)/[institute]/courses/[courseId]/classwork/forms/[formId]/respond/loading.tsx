export default function FormLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] pb-24">
      {/* Top bar skeleton */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
          <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse" />
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* Header Card Skeleton */}
        <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 shadow-xs overflow-hidden">
          <div className="h-3 w-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 animate-pulse" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="h-7 w-3/4 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="h-4 w-2/3 rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="h-3 w-28 rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
              <div className="h-3 w-20 rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Question Cards Skeletons */}
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-5 sm:p-7 space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-4/5 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
              </div>
              <div className="h-5 w-14 rounded-full bg-slate-100 dark:bg-white/10 animate-pulse shrink-0" />
            </div>

            <div className="space-y-2.5 pt-2">
              {[1, 2, 3, 4].map((opt) => (
                <div
                  key={opt}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]"
                >
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-white/10 animate-pulse shrink-0" />
                  <div className="h-3.5 w-40 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom Actions Skeleton */}
        <div className="pt-2 flex items-center justify-between">
          <div className="h-9 w-20 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
