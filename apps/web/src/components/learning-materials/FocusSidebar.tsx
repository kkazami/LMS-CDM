"use client";

import { useState } from "react";
import { Timer, X } from "lucide-react";

export default function FocusSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 px-5 py-4 shadow-xs hover:bg-slate-50 dark:hover:bg-[#181B26] hover:shadow-md transition-all h-fit shrink-0 group cursor-pointer"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#F97316] group-hover:scale-110 transition-transform">
          <Timer className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">Focus Mode</p>
          <p className="text-xs font-medium text-slate-500 dark:text-[#8B92A5]">Open Pomodoro timer</p>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto transition-all animate-in slide-in-from-right-8">
      <div className="flex items-center justify-between bg-white dark:bg-[#141721] rounded-2xl p-4 border border-slate-200/80 dark:border-white/5 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
          <Timer className="h-5 w-5 text-[#F97316]" />
          Focus Tools
        </h3>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#181B26] hover:bg-slate-100 dark:hover:bg-[#1E2132] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  );
}
