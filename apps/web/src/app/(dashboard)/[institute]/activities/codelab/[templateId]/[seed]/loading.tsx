import React from "react";

export default function CodeLabLoading() {
  return (
    <div
      className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-950 overflow-hidden select-none animate-pulse"
      style={{ height: "calc(100vh - 73px)" }}
    >
      {/* Topbar Skeleton */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-24 h-7 bg-slate-800 rounded-lg" />
          <div className="w-48 h-5 bg-slate-800 rounded" />
          <div className="w-16 h-5 bg-slate-800 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-6 bg-slate-800 rounded" />
          <div className="w-16 h-7 bg-slate-800 rounded-lg" />
          <div className="w-28 h-7 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* 3-Panel Skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-[32%] bg-slate-900 border-r border-slate-800 p-5 space-y-4">
          <div className="w-3/4 h-6 bg-slate-800 rounded" />
          <div className="w-full h-4 bg-slate-800/60 rounded" />
          <div className="w-5/6 h-4 bg-slate-800/60 rounded" />
          <div className="w-4/6 h-4 bg-slate-800/60 rounded" />
          <div className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800/50 mt-6" />
          <div className="w-full h-20 bg-slate-950 rounded-xl border border-slate-800/50" />
        </div>

        {/* Center Panel (Editor) */}
        <div className="flex-1 bg-[#1e1e1e] p-6 space-y-3">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-20 h-4 bg-slate-700/50 rounded" />
            <div className="w-28 h-6 bg-slate-800 rounded" />
          </div>
          <div className="w-1/3 h-4 bg-slate-700/40 rounded font-mono" />
          <div className="w-1/2 h-4 bg-slate-700/30 rounded font-mono ml-4" />
          <div className="w-2/5 h-4 bg-slate-700/30 rounded font-mono ml-4" />
          <div className="w-1/4 h-4 bg-slate-700/40 rounded font-mono" />
        </div>

        {/* Right Panel (Results) */}
        <div className="w-[32%] bg-slate-900 border-l border-slate-800 p-4 space-y-3">
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            <div className="flex-1 h-7 bg-slate-800 rounded" />
            <div className="flex-1 h-7 bg-slate-800 rounded" />
          </div>
          <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-800/60" />
          <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-800/60" />
          <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-800/60" />
        </div>
      </div>
    </div>
  );
}
