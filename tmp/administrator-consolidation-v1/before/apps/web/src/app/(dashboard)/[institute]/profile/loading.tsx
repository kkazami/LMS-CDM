import Skeleton from "@/components/common/Skeleton";

export default function ProfileLoading() {
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

      {/* Edit form skeleton */}
      <div className="px-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs">
          <Skeleton className="h-5 w-28" shimmer />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" shimmer />
            <Skeleton className="h-10 w-full rounded-xl" shimmer />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-20 w-full rounded-xl" shimmer />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" shimmer />
            <Skeleton className="h-10 w-full rounded-xl" shimmer />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" shimmer />
        </div>
      </div>
    </div>
  );
}
