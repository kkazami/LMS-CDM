"use client";

import { useState } from "react";

export function useKxBookmark(postId: string, initialIsBookmarked = false) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isToggling, setIsToggling] = useState(false);

  const toggleBookmark = async () => {
    if (isToggling) return;
    setIsToggling(true);
    const prev = isBookmarked;
    setIsBookmarked(!prev);

    try {
      const res = await fetch("/api/knowledge-exchange/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(data.isBookmarked);
      } else {
        setIsBookmarked(prev);
      }
    } catch {
      setIsBookmarked(prev);
    } finally {
      setIsToggling(false);
    }
  };

  return {
    isBookmarked,
    isToggling,
    toggleBookmark,
  };
}
