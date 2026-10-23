"use client";

import { useRef, type ReactNode } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface ConfirmDialogProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

/** Modal shell used by confirm prompts: dialog role, Esc, focus trap and focus return. */
export default function ConfirmDialog({ title, description, onClose, children }: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(true, onClose, panelRef);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1C2030] rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F1F5F9] outline-none"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-bold mb-2">
          {title}
        </h3>
        <p id="confirm-dialog-description" className="text-xs text-slate-600 dark:text-[#94A3B8] mb-6">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}
