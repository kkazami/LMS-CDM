"use client";

import { useEffect, useRef, useState } from "react";

export function PerformanceTracker({ activityName }: { activityName: string }) {
  const mountTime = useRef(performance.now());
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    // Record time when component has fully mounted
    const time = performance.now() - mountTime.current;
    setLoadTime(time);
    
    // In production, this would fire an analytics event
    console.log(`[PERF_BUDGET] ${activityName} Interactive Load: ${time.toFixed(2)}ms`);
  }, [activityName]);

  if (!loadTime) return null;

  return (
    <div className="absolute top-2 right-2 bg-black/80 text-green-400 text-[10px] font-mono px-2 py-1 rounded pointer-events-none z-50">
      TTI: {(loadTime / 1000).toFixed(2)}s
    </div>
  );
}
