export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      {/* Banner skeleton */}
      <div className="h-36 rounded-t-2xl bg-gray-200 sm:h-44" />

      <div className="relative px-6">
        {/* Avatar skeleton */}
        <div className="-mt-12 mb-4">
          <div className="h-20 w-20 rounded-full bg-gray-300 ring-4 ring-white" />
        </div>

        {/* Name skeleton */}
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="mt-2 flex items-center gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
      </div>

      {/* Edit form skeleton */}
      <div className="mt-8 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg bg-gray-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-12 rounded bg-gray-200" />
            <div className="h-20 w-full rounded-lg bg-gray-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg bg-gray-100" />
          </div>
          <div className="h-10 w-full rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
