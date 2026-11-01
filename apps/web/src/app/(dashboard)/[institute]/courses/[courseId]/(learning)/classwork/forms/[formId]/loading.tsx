export default function FormHubLoading() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-8 space-y-4 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto bg-slate-200 dark:bg-white/10 animate-pulse" />
        <div className="h-6 w-3/4 mx-auto rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
        <div className="h-4 w-1/2 mx-auto rounded-md bg-slate-100 dark:bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}
