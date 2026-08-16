"use client";

import { useState, useRef, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import UserAvatar from "@/components/common/UserAvatar";
import { X, Send, AlertTriangle, Clock } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  sentiment: string | null;
  createdAt: string | Date;
  sender: { id: string; name: string };
}

interface PrivateCommentDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: InstituteTheme;
  studentName: string;
  studentId: string;
  studentAvatarUrl?: string | null;
  comments: Comment[];
  currentUserId: string;
  onSend: (content: string) => void;
  sending?: boolean;
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default function PrivateCommentDrawer({
  open,
  onClose,
  theme,
  studentName,
  studentId,
  studentAvatarUrl,
  comments,
  currentUserId,
  onSend,
  sending = false,
}: PrivateCommentDrawerProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, comments.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-[#141721] border-l border-slate-200/80 dark:border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={studentName}
              avatarUrl={studentAvatarUrl}
              size="md"
              color={theme.colors.primary}
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                {studentName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">Private feedback channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-[#F0F2F8] transition cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="rounded-full bg-slate-100 dark:bg-white/5 p-4 mb-3">
                <Send className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">No messages yet</p>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
                Send private feedback about this student's progress
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isOwnMessage = comment.sender.id === currentUserId;
              return (
                <div
                  key={comment.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      isOwnMessage
                        ? "rounded-br-xs text-white"
                        : "rounded-bl-xs border border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-[#1E2132] text-slate-800 dark:text-[#F0F2F8]"
                    }`}
                    style={
                      isOwnMessage
                        ? { backgroundColor: theme.colors.primary }
                        : undefined
                    }
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1" style={{ color: theme.colors.primary }}>
                        {comment.sender.name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwnMessage ? "justify-end" : ""}`}>
                      {comment.sentiment === "negative" && (
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                      )}
                      <span
                        className={`text-[10px] ${
                          isOwnMessage ? "text-white/70" : "text-slate-400 dark:text-[#8B92A5]"
                        }`}
                      >
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200/80 dark:border-white/5 p-4 flex gap-2 bg-slate-50/30 dark:bg-white/[0.01]"
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write private feedback..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
            disabled={sending}
          />
          <Button
            theme={theme}
            type="submit"
            disabled={!message.trim() || sending}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
