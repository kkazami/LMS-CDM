import Skeleton from "@/components/common/Skeleton";

export default function ClassworkLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-40" shimmer />
        <Skeleton className="h-9 w-28" shimmer />
      </div>

      {/* Accordion items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" shimmer />
                <Skeleton className="h-3 w-28" shimmer />
              </div>
            </div>
            <Skeleton className="h-5 w-16" shimmer />
          </div>
        </div>
      ))}
    </div>
  );
}
