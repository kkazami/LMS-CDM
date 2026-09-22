"use client";

import React, { useState } from "react";
import { Bookmark } from "lucide-react";

interface KxBookmarkButtonProps {
  postId: string;
  initialBookmarked?: boolean;
  className?: string;
  showLabel?: boolean;
}

export default function KxBookmarkButton({
  postId,
  initialBookmarked = false,
  className = "",
  showLabel = false,
}: KxBookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    const nextState = !bookmarked;
    setBookmarked(nextState);
    setIsLoading(true);

    try {
      const res = await fetch("/api/knowledge-exchange/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (!res.ok) {
        // Rollback
        setBookmarked(!nextState);
      } else {
        const data = await res.json();
        if (typeof data.bookmarked === "boolean") {
          setBookmarked(data.bookmarked);
        }
      }
    } catch {
      setBookmarked(!nextState);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this post"}
      title={bookmarked ? "Saved to bookmarks" : "Bookmark for later"}
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-all ${
        bookmarked
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
      } ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 ${bookmarked ? "fill-amber-500 text-amber-500" : ""}`}
      />
      {showLabel && <span>{bookmarked ? "Saved" : "Save"}</span>}
    </button>
  );
}
