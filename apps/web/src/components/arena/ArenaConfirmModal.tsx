"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ArenaConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  itemName?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ArenaConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  itemName,
  isBusy = false,
  onConfirm,
  onCancel,
}: ArenaConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isBusy, onCancel]);

  if (!open) return null;

  const iconConfig = {
    danger: {
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
      icon: Trash2,
      btnBg: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
      icon: AlertTriangle,
      btnBg: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25",
    },
    info: {
      bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      icon: Info,
      btnBg: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25",
    },
  }[variant];

  const IconComponent = iconConfig.icon;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={isBusy ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          aria-label="Close"
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${iconConfig.bg}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3
              id="modal-title"
              className="text-lg font-black text-slate-900 dark:text-white leading-snug"
            >
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {description}
            </p>

            {itemName && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {itemName}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition shadow-md active:scale-95 disabled:opacity-50 ${iconConfig.btnBg}`}
          >
            {isBusy ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
