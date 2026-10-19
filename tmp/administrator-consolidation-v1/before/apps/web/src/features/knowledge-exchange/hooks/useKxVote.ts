"use client";

import { useState } from "react";
import { KxVoteType } from "../types";

export function useKxVote(
  targetType: "POST" | "ANSWER",
  targetId: string,
  initialCount = 0,
  initialUserVote: KxVoteType | null = null
) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<KxVoteType | null>(initialUserVote);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vote = async (newVote: KxVoteType) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const prevVote = userVote;
    const prevCount = voteCount;

    // Optimistic calculation
    let nextVote: KxVoteType | null = newVote;
    let delta = 0;

    if (prevVote === newVote) {
      // Toggle off
      nextVote = null;
      delta = newVote === "UP" ? -1 : 1;
    } else if (prevVote === null) {
      delta = newVote === "UP" ? 1 : -1;
    } else {
      // Switching UP -> DOWN or DOWN -> UP
      delta = newVote === "UP" ? 2 : -2;
    }

    setUserVote(nextVote);
    setVoteCount(prevCount + delta);

    try {
      const res = await fetch("/api/knowledge-exchange/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          voteType: newVote,
        }),
      });

      if (!res.ok) {
        // Rollback
        setUserVote(prevVote);
        setVoteCount(prevCount);
      } else {
        const data = await res.json();
        setVoteCount(data.voteCount);
        setUserVote(data.userVote);
      }
    } catch {
      setUserVote(prevVote);
      setVoteCount(prevCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    voteCount,
    userVote,
    isSubmitting,
    vote,
  };
}
