"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** The visual variant of a toast notification. */
export type ToastType = "success" | "error" | "info" | "warning";

/** Represents a single toast message in the queue. */
export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// ─── Global Singleton State ───
type Listener = (toasts: ToastMessage[]) => void;
let toasts: ToastMessage[] = [];
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

function addToast(
  type: ToastType,
  title: string,
  description?: string,
  duration = 4000
) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, type, title, description, duration }];
  notify();
  setTimeout(() => removeToast(id), duration);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

/** Global toast API — call from any Client Component. */
export interface ToastAPI {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

export const toast: ToastAPI = {
  success: (title, description) => addToast("success", title, description),
  error: (title, description) => addToast("error", title, description),
  info: (title, description) => addToast("info", title, description),
  warning: (title, description) => addToast("warning", title, description),
};

// ─── Icon Map ───
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
  info: <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
};

/**
 * Renders the toast notification container. Mount once in DashboardLayout.
 */
export default function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function onUpdate(updated: ToastMessage[]) {
      setMessages(updated);
    }
    listeners.add(onUpdate);
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3 max-w-sm"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-gray-200",
            "animate-[slideInRight_0.3s_ease-out_both]"
          )}
          role="alert"
        >
          {ICONS[msg.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{msg.title}</p>
            {msg.description && (
              <p className="mt-0.5 text-xs text-gray-500">{msg.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(msg.id)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
