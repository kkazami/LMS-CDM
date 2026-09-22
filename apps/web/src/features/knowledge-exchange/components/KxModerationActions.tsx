"use client";

import React, { useState } from "react";
import { Shield, Lock, Unlock, Pin, CheckCircle, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { KxPostDetailData } from "../types";

interface KxModerationActionsProps {
  post: KxPostDetailData;
  onActionComplete?: () => void;
}

export function KxModerationActions({ post, onActionComplete }: KxModerationActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = post.status === "CLOSED";
  const isLocked = post.status === "LOCKED";
  const isPinned = post.isPinned;

  const handleExecute = async () => {
    if (!selectedAction || !reason.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/knowledge-exchange/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "POST",
          targetId: post.id,
          action: selectedAction,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to execute moderation action");
      }

      setIsOpen(false);
      setSelectedAction(null);
      setReason("");
      onActionComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Moderation action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        title="Moderator Tools"
      >
        <Shield className="w-3.5 h-3.5 text-primary" />
        Moderate
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card shadow-xl p-4 z-50 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              Moderator Actions
            </h4>
            <button
              onClick={() => {
                setIsOpen(false);
                setSelectedAction(null);
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {!selectedAction ? (
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => setSelectedAction(isClosed ? "REOPEN_QUESTION" : "CLOSE_QUESTION")}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/80 text-left"
              >
                <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                {isClosed ? "Reopen Question" : "Close Question"}
              </button>

              <button
                onClick={() => setSelectedAction(isLocked ? "UNLOCK_THREAD" : "LOCK_THREAD")}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/80 text-left"
              >
                {isLocked ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-rose-500" />}
                {isLocked ? "Unlock Thread" : "Lock Thread"}
              </button>

              <button
                onClick={() => setSelectedAction(isPinned ? "UNPIN_POST" : "PIN_POST")}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/80 text-left"
              >
                <Pin className="w-3.5 h-3.5 text-primary" />
                {isPinned ? "Unpin Post" : "Pin to Top"}
              </button>

              <button
                onClick={() => setSelectedAction(post.isDeleted ? "RESTORE" : "SOFT_DELETE")}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left"
              >
                {post.isDeleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                {post.isDeleted ? "Restore Post" : "Soft Delete Post"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">{selectedAction.replace(/_/g, " ")}</span>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-muted-foreground hover:underline text-[11px]"
                >
                  Change action
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Reason (required for audit trail):
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter policy or academic reason..."
                  rows={2}
                  className="w-full p-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] rounded flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedAction(null)}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isSubmitting || reason.trim().length < 3}
                  className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Applying..." : "Confirm Action"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
