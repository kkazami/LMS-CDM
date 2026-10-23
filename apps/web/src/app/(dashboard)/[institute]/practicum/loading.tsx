import Skeleton from "@/components/common/Skeleton";

export default function PracticumLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading practicum">
      <Skeleton className="h-36 w-full rounded-3xl" shimmer />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" shimmer />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" shimmer />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
