"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Tag, X } from "lucide-react";
import type { KxTagSummary } from "../types";
import KxTagBadge from "./KxTagBadge";
import { KX_VALIDATION } from "../constants";

interface KxTagSelectorProps {
  availableTags: KxTagSummary[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export default function KxTagSelector({
  availableTags,
  selectedTagIds,
  onChange,
  disabled = false,
}: KxTagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const selectedTags = useMemo(
    () => availableTags.filter((t) => selectedTagIds.includes(t.id)),
    [availableTags, selectedTagIds]
  );

  const filteredTags = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableTags.filter(
      (t) =>
        !selectedTagIds.includes(t.id) &&
        (t.name.toLowerCase().includes(term) ||
          t.slug.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term))
    );
  }, [availableTags, selectedTagIds, searchTerm]);

  const handleSelect = (tagId: string) => {
    if (disabled || selectedTagIds.length >= KX_VALIDATION.MAX_TAGS) return;
    onChange([...selectedTagIds, tagId]);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleRemove = (tagId: string) => {
    if (disabled) return;
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <label className="block text-sm font-semibold text-slate-900 dark:text-white">
        Tags{" "}
        <span className="text-xs font-normal text-slate-500">
          (Select {KX_VALIDATION.MIN_TAGS} to {KX_VALIDATION.MAX_TAGS} tags)
        </span>
      </label>

      {/* Selected Tags Display */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924]">
        {selectedTags.map((tag) => (
          <KxTagBadge
            key={tag.id}
            slug={tag.slug}
            name={tag.name}
            category={tag.category}
            clickable={false}
            onRemove={() => handleRemove(tag.id)}
          />
        ))}

        {selectedTagIds.length < KX_VALIDATION.MAX_TAGS && (
          <div className="relative flex-1 min-w-[140px]">
            <input
              type="text"
              value={searchTerm}
              disabled={disabled}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onClick={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              placeholder={
                selectedTagIds.length === 0
                  ? "Search tags (e.g., dsa, web-dev, embedded)..."
                  : "Add another tag..."
              }
              className="w-full bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />

            {/* Dropdown Suggestions */}
            {isOpen && filteredTags.length > 0 && (
              <div
                className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full min-w-[240px] overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1F2C] p-1.5 shadow-xl"
              >
                {filteredTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelect(tag.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tag.name}
                      </span>
                      {tag.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {tag.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500">
                      {tag.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
