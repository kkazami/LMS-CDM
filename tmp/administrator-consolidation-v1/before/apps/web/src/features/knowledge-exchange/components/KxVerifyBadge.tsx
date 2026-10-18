"use client";

import React, { useState } from "react";
import { Award, ShieldCheck, Loader2 } from "lucide-react";

interface KxVerifyBadgeProps {
  answerId: string;
  isVerified: boolean;
  canVerify: boolean; // True for PROFESSOR/TEACHER or ADMIN
  verifierName?: string | null;
  onVerifiedChanged?: (verified: boolean) => void;
}

export default function KxVerifyBadge({
  answerId,
  isVerified,
  canVerify,
  verifierName,
  onVerifiedChanged,
}: KxVerifyBadgeProps) {
  const [verified, setVerified] = useState(isVerified);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!canVerify || loading) return;

    const nextState = !verified;
    setVerified(nextState);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/knowledge-exchange/answers/${answerId}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVerified: nextState }),
        }
      );

      if (!res.ok) {
        setVerified(!nextState);
      } else {
        const data = await res.json();
        const finalVerified = data.answer?.isVerified ?? nextState;
        setVerified(finalVerified);
        onVerifiedChanged?.(finalVerified);
      }
    } catch {
      setVerified(!nextState);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold">
        <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
        <span>Instructor Verified</span>
        {verifierName && (
          <span className="text-[10px] font-normal opacity-80">
            by {verifierName}
          </span>
        )}
        {canVerify && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className="ml-1 text-[10px] underline text-slate-400 hover:text-red-500 cursor-pointer"
          >
            (Remove)
          </button>
        )}
      </div>
    );
  }

  // Not verified, and user has permission to verify
  if (!canVerify) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/5 transition-all cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
      ) : (
        <Award className="h-3.5 w-3.5" />
      )}
      <span>Verify Answer</span>
    </button>
  );
}
