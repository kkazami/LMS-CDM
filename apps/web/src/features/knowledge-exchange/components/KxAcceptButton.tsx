"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface KxAcceptButtonProps {
  answerId: string;
  isAccepted: boolean;
  canAccept: boolean; // True only if current viewer is the question author
  onAcceptedChanged?: (accepted: boolean) => void;
}

export default function KxAcceptButton({
  answerId,
  isAccepted,
  canAccept,
  onAcceptedChanged,
}: KxAcceptButtonProps) {
  const [accepted, setAccepted] = useState(isAccepted);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!canAccept || loading) return;

    const nextState = !accepted;
    setAccepted(nextState);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/knowledge-exchange/answers/${answerId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAccepted: nextState }),
        }
      );

      if (!res.ok) {
        setAccepted(!nextState);
      } else {
        const data = await res.json();
        const finalAccepted = data.answer?.isAccepted ?? nextState;
        setAccepted(finalAccepted);
        onAcceptedChanged?.(finalAccepted);
      }
    } catch {
      setAccepted(!nextState);
    } finally {
      setLoading(false);
    }
  };

  // If already accepted, display the badge
  if (accepted) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>Accepted Answer</span>
        {canAccept && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className="ml-1 text-[10px] underline text-slate-400 hover:text-red-500 cursor-pointer"
          >
            (Unaccept)
          </button>
        )}
      </div>
    );
  }

  // If not accepted, only show button if viewer is question author
  if (!canAccept) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      <span>Accept Answer</span>
    </button>
  );
}
