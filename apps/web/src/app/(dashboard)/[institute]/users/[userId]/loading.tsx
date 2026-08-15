import Skeleton from "@/components/common/Skeleton";

export default function PublicProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Banner skeleton */}
      <Skeleton className="h-36 rounded-2xl sm:h-44 w-full" shimmer />

      <div className="relative px-6">
        {/* Avatar skeleton */}
        <div className="-mt-14 mb-4">
          <Skeleton className="h-24 w-24 rounded-full ring-4 ring-white dark:ring-[#0B0D13]" shimmer />
        </div>

        {/* Name skeleton */}
        <Skeleton className="h-7 w-48" shimmer />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" shimmer />
          <Skeleton className="h-4 w-36" shimmer />
        </div>
      </div>

      {/* About section skeleton */}
      <div className="px-6">
        <Skeleton className="h-5 w-24 mb-3" shimmer />
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 space-y-3 shadow-xs">
          <Skeleton className="h-4 w-full" shimmer />
          <Skeleton className="h-4 w-3/4" shimmer />
          <div className="border-t border-slate-100 dark:border-white/5 pt-3 space-y-2">
            <Skeleton className="h-4 w-48" shimmer />
            <Skeleton className="h-4 w-40" shimmer />
          </div>
        </div>
      </div>

      {/* Courses section skeleton */}
      <div className="px-6 pb-8">
        <Skeleton className="h-5 w-28 mb-3" shimmer />
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32 rounded-full" shimmer />
            <Skeleton className="h-8 w-40 rounded-full" shimmer />
            <Skeleton className="h-8 w-36 rounded-full" shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}
