"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";

interface KxDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  itemType?: "post" | "comment";
  itemName?: string;
  confirmLabel?: string;
}

export default function KxDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemType = "post",
  itemName,
  confirmLabel = "Delete",
}: KxDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to delete. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1F2C] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="delete-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Confirm {itemType} deletion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {description}
        </p>

        {/* Optional preview of item name / snippet */}
        {itemName && (
          <div className="rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-3 text-xs text-slate-700 dark:text-slate-300 italic line-clamp-2">
            &ldquo;{itemName}&rdquo;
          </div>
        )}

        {/* Warning Callout */}
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This action cannot be undone.</span>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
