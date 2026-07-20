"use client";

import { useState, useRef, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
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
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {studentName}
              </h3>
              <p className="text-xs text-gray-500">Private feedback channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-3">
                <Send className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">
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
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                      isOwnMessage
                        ? "rounded-br-sm text-white"
                        : "rounded-bl-sm border border-gray-300 bg-gray-50 text-gray-800"
                    }`}
                    style={
                      isOwnMessage
                        ? { backgroundColor: theme.colors.primary }
                        : undefined
                    }
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-medium mb-1" style={{ color: theme.colors.primary }}>
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
                          isOwnMessage ? "text-white/70" : "text-gray-400"
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
          className="border-t border-gray-300 p-4 flex gap-2"
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write private feedback..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            style={{ borderColor: theme.colors.border }}
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
