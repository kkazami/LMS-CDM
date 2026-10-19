"use client";

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface KxSearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function KxSearchBar({
  initialValue = "",
  onSearch,
  placeholder = "Search questions, discussions, code snippets...",
}: KxSearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  // Sync state if prop changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-xs"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
