"use client";

import React, { useState } from "react";
import { Flag, X, AlertTriangle, Send, Loader2, Check } from "lucide-react";
import { KX_FLAG_REASONS, KX_FLAG_REASON_LABELS } from "../constants";
import type { KxFlagReason } from "../types";

interface KxFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  answerId?: string;
  commentId?: string;
  isAssessmentLinked?: boolean;
}

export default function KxFlagModal({
  isOpen,
  onClose,
  postId,
  answerId,
  commentId,
  isAssessmentLinked = false,
}: KxFlagModalProps) {
  const [reason, setReason] = useState<KxFlagReason>(
    isAssessmentLinked ? "CHEATING" : "SPAM"
  );
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/knowledge-exchange/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          answerId,
          commentId,
          reason,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data?.error || "Failed to submit report.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1F2C] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Flag className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-bold">Report Content</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Report Submitted
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thank you for keeping our academic community safe. Instructors
              have been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAssessmentLinked && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  This item is linked to a course assessment. Academic cheating
                  reports receive expedited instructor review.
                </span>
              </div>
            )}

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Reporting <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {KX_FLAG_REASONS.map((r) => {
                  const isCheating = r === "CHEATING";
                  return (
                    <label
                      key={r}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        reason === r
                          ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-medium"
                          : isCheating && isAssessmentLinked
                          ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                          : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="flagReason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-xs">{KX_FLAG_REASON_LABELS[r]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any relevant context for instructors..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
