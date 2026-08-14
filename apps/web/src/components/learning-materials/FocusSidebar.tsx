"use client";

import { useState } from "react";
import { Timer, X } from "lucide-react";

export default function FocusSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-5 py-4 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all h-fit shrink-0 group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
          <Timer className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900">Focus Mode</p>
          <p className="text-xs font-medium text-gray-500">Open Pomodoro timer</p>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto transition-all animate-in slide-in-from-right-8">
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
          <Timer className="h-5 w-5 text-indigo-500" />
          Focus Tools
        </h3>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  );
}
