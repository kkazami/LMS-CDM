import Skeleton from "@/components/common/Skeleton";

export default function ClassworkLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-40" shimmer />
        <Skeleton className="h-10 w-28 rounded-xl" shimmer />
      </div>

      {/* Accordion items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" shimmer />
                <Skeleton className="h-3 w-28" shimmer />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" shimmer />
          </div>
        </div>
      ))}
    </div>
  );
}
