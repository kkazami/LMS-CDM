"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface KxVoteButtonProps {
  initialVoteCount: number;
  initialUserVote?: number; // 1, -1, or 0
  postId?: string;
  answerId?: string;
  disabled?: boolean;
  isSelf?: boolean;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
  onVoteChange?: (newVoteCount: number, newUserVote: number) => void;
}

export default function KxVoteButton({
  initialVoteCount,
  initialUserVote = 0,
  postId,
  answerId,
  disabled = false,
  isSelf = false,
  orientation = "vertical",
  size = "md",
  onVoteChange,
}: KxVoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVoteCount(initialVoteCount);
  }, [initialVoteCount]);

  useEffect(() => {
    setUserVote(initialUserVote);
  }, [initialUserVote]);

  const handleVote = async (direction: 1 | -1) => {
    if (disabled || isSelf || isLoading) return;

    // Calculate new vote value
    // If clicking the same direction, toggle off (0)
    const targetValue = userVote === direction ? 0 : direction;
    const diff = targetValue - userVote;
    const optimisticCount = voteCount + diff;

    // Optimistic UI update
    setUserVote(targetValue);
    setVoteCount(optimisticCount);
    onVoteChange?.(optimisticCount, targetValue);
    setIsLoading(true);

    try {
      const res = await fetch("/api/knowledge-exchange/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          answerId,
          value: targetValue,
        }),
      });

      if (!res.ok) {
        // Rollback on failure
        setUserVote(userVote);
        setVoteCount(voteCount);
        onVoteChange?.(voteCount, userVote);
      } else {
        const data = await res.json();
        if (data && typeof data.voteCount === "number") {
          setVoteCount(data.voteCount);
          onVoteChange?.(data.voteCount, targetValue);
        }
      }
    } catch {
      // Rollback
      setUserVote(userVote);
      setVoteCount(voteCount);
      onVoteChange?.(voteCount, userVote);
    } finally {
      setIsLoading(false);
    }
  };

  const isVertical = orientation === "vertical";
  const btnClasses = size === "sm" ? "p-1" : "p-1.5";
  const iconClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={`flex items-center select-none ${
        isVertical
          ? "flex-col justify-center rounded-xl bg-slate-100/70 dark:bg-white/5 p-1 border border-slate-200/60 dark:border-white/5"
          : "flex-row gap-1 bg-slate-100/70 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-white/5"
      }`}
    >
      {/* Upvote Button */}
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={disabled || isSelf}
        title={isSelf ? "You cannot vote on your own post" : "Upvote"}
        aria-label="Upvote"
        className={`${btnClasses} rounded-lg transition-colors ${
          userVote === 1
            ? "bg-orange-500 text-white shadow-xs"
            : "text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-200 dark:hover:bg-white/10"
        } ${isSelf ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <ChevronUp className={iconClasses} />
      </button>

      {/* Vote Count */}
      <span
        className={`font-mono font-bold text-center ${
          size === "sm" ? "text-xs px-1" : "text-sm px-2 py-0.5"
        } ${
          voteCount > 0
            ? "text-orange-600 dark:text-orange-400"
            : voteCount < 0
            ? "text-red-500"
            : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {voteCount}
      </span>

      {/* Downvote Button */}
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={disabled || isSelf}
        title={isSelf ? "You cannot vote on your own post" : "Downvote"}
        aria-label="Downvote"
        className={`${btnClasses} rounded-lg transition-colors ${
          userVote === -1
            ? "bg-red-500 text-white shadow-xs"
            : "text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-white/10"
        } ${isSelf ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <ChevronDown className={iconClasses} />
      </button>
    </div>
  );
}
