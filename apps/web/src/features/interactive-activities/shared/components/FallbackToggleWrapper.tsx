"use client";

import { useState, ReactNode, Suspense } from "react";
import { Monitor, Smartphone, Loader2 } from "lucide-react";
import { PerformanceTracker } from "./PerformanceTracker";

interface FallbackToggleWrapperProps {
  activityName: string;
  Scene3D: ReactNode;
  Scene2D: ReactNode;
}

export function FallbackToggleWrapper({ activityName, Scene3D, Scene2D }: FallbackToggleWrapperProps) {
  const [is2D, setIs2D] = useState(false);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex bg-white/10 backdrop-blur border border-white/20 p-1 rounded-full shadow-lg">
        <button
          onClick={() => setIs2D(false)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${!is2D ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          aria-label="Enable 3D Mode"
        >
          <Monitor className="w-4 h-4" /> 3D Mode
        </button>
        <button
          onClick={() => setIs2D(true)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${is2D ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          aria-label="Enable 2D Fallback Mode"
        >
          <Smartphone className="w-4 h-4" /> 2D Fallback
        </button>
      </div>

      <PerformanceTracker activityName={activityName} />

      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
          <h2 className="font-bold text-xl">Loading {activityName}...</h2>
          <p className="text-slate-400 text-sm">Optimizing assets...</p>
        </div>
      }>
        {is2D ? Scene2D : Scene3D}
      </Suspense>
    </div>
  );
}
