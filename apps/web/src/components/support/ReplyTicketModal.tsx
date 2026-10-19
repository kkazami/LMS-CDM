"use client";

import { useEffect, useState } from "react";
import { X, MessageSquare, Send, CheckCircle2, Loader2, Clock } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
  adminReply: string | null;
  repliedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ReplyTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  theme: InstituteTheme;
  onSaveReply: (id: string, text: string, alsoResolve: boolean) => Promise<void>;
  isUpdating: boolean;
}

export function ReplyTicketModal({
  isOpen,
  onClose,
  ticket,
  theme,
  onSaveReply,
  isUpdating,
}: ReplyTicketModalProps) {
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (ticket) {
      setReplyText(ticket.adminReply || "");
    } else {
      setReplyText("");
    }
  }, [ticket]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  const isOpenStatus = ticket.status !== "RESOLVED" && ticket.status !== "CLOSED";

  const handleSend = async (alsoResolve: boolean) => {
    if (!replyText.trim()) return;
    await onSaveReply(ticket.id, replyText, alsoResolve);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 page-enter">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog Centered */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#141721] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {ticket.adminReply ? "Edit Reply" : "Reply to Ticket"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Send an official response to {ticket.author?.name || "the user"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Original Ticket Context Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181B26] border border-slate-200/80 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Original Ticket
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {ticket.subject}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto pr-1">
              {ticket.message}
            </p>

            {/* Author info footer inside context box */}
            <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs flex-wrap">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {ticket.author?.name ? ticket.author.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {ticket.author?.name || "User"}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase font-bold">
                {ticket.author?.role || "USER"}
              </span>
              {ticket.author?.email && (
                <span className="text-slate-400 text-[11px] truncate">
                  • {ticket.author.email}
                </span>
              )}
            </div>
          </div>

          {/* Response Textarea */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Your Response
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response, instructions, or resolution here..."
              rows={5}
              className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#10131c] text-slate-900 dark:text-white outline-none focus:ring-2 resize-y transition-all"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              disabled={isUpdating}
              autoFocus
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#10131c] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSend(false)}
              disabled={isUpdating || !replyText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {ticket.adminReply ? "Save Changes" : "Send Reply"}
            </button>

            {isOpenStatus && (
              <button
                type="button"
                onClick={() => handleSend(true)}
                disabled={isUpdating || !replyText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Reply & Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
