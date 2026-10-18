"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";

export type FilterTab = "all" | "unanswered" | "answered" | "discussions" | "my-posts";
export type SortOption = "newest" | "votes" | "active";

interface KxFilterBarProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function KxFilterBar({
  activeTab,
  onTabChange,
  activeSort,
  onSortChange,
}: KxFilterBarProps) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All Questions" },
    { key: "unanswered", label: "Unanswered" },
    { key: "answered", label: "Answered" },
    { key: "discussions", label: "Discussions" },
  ];

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-1.5 ml-auto text-xs">
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
        >
          <option value="newest">Newest</option>
          <option value="votes">Top Voted</option>
          <option value="active">Recently Active</option>
        </select>
      </div>
    </div>
  );
}
