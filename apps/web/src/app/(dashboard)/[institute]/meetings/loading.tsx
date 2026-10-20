import Skeleton from "@/components/common/Skeleton";

export default function MeetingsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading class meetings">
      {/* Banner Skeleton */}
      <Skeleton className="h-36 w-full rounded-3xl" shimmer />

      {/* Toolbar Skeleton */}
      <Skeleton className="h-14 w-full rounded-2xl" shimmer />

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-3xl" shimmer />
        ))}
      </div>

      {/* History Items Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" shimmer />
        ))}
      </div>
      <span className="sr-only">Loading meetings…</span>
    </div>
  );
}
