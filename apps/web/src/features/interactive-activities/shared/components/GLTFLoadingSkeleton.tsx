/**
 * GLTFLoadingSkeleton — Placeholder UI shown while a 3D model is loading.
 *
 * Displays a pulsing skeleton with a 3D icon to indicate that a model
 * is being fetched and decoded. Used by activity modules as the
 * Suspense fallback inside their Canvas wrapper.
 *
 * This is a 2D HTML component (not a Three.js scene), so it renders
 * outside the Canvas as an overlay or in place of the Canvas.
 */

"use client";

import { Loader2 } from "lucide-react";

interface GLTFLoadingSkeletonProps {
  /** Optional message to display below the spinner. */
  message?: string;
  /** Height of the skeleton container. Defaults to "400px". */
  height?: string;
}

export default function GLTFLoadingSkeleton({
  message = "Loading 3D model…",
  height = "400px",
}: GLTFLoadingSkeletonProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-[#141721]"
      style={{ height }}
      role="status"
      aria-label="Loading 3D model"
    >
      <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-[#8B92A5] mb-3" />
      <p className="text-xs text-slate-500 dark:text-[#8B92A5] animate-pulse">{message}</p>
    </div>
  );
}
