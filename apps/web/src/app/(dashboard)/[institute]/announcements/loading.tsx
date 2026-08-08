import Skeleton from "@/components/common/Skeleton";

export default function AnnouncementsLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <Skeleton className="h-8 w-40" shimmer />
        <Skeleton className="h-4 w-56 mt-2" shimmer />
      </div>

      {/* 4 announcement card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" shimmer />
                <Skeleton className="h-3 w-20" shimmer />
              </div>
              <Skeleton className="h-4 w-full" shimmer />
              <Skeleton className="h-4 w-4/5" shimmer />
              <Skeleton className="h-3 w-2/5" shimmer />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
