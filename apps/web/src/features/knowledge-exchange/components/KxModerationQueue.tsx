"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Unlock,
  Pin,
  Trash2,
  Check,
  X,
  History,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { KxFlagItem, KxModerationActionItem } from "../types";
import { formatRelativeTime } from "../utils";

interface KxModerationQueueProps {
  initialFlags: KxFlagItem[];
  initialActions: KxModerationActionItem[];
  instituteCode: string;
}

export default function KxModerationQueue({
  initialFlags,
  initialActions,
  instituteCode,
}: KxModerationQueueProps) {
  const [flags, setFlags] = useState<KxFlagItem[]>(initialFlags);
  const [actions, setActions] = useState<KxModerationActionItem[]>(initialActions);
  const [activeTab, setActiveTab] = useState<"pending" | "audit">("pending");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleModerationAction = async ({
    actionType,
    targetType,
    targetId,
    postId,
    reason,
  }: {
    actionType: string;
    targetType: "POST" | "ANSWER" | "COMMENT";
    targetId: string;
    postId?: string;
    reason?: string;
  }) => {
    setLoadingAction(`${actionType}-${targetId}`);

    try {
      const res = await fetch("/api/knowledge-exchange/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          targetType,
          targetId,
          postId,
          reason,
        }),
      });

      if (res.ok) {
        // Remove handled flag from queue
        setFlags((prev) =>
          prev.filter(
            (f) =>
              !(
                (targetType === "POST" && f.postId === targetId) ||
                (targetType === "ANSWER" && f.answerId === targetId) ||
                (targetType === "COMMENT" && f.commentId === targetId)
              )
          )
        );

        // Refresh actions queue
        fetch("/api/knowledge-exchange/moderation/queue")
          .then((r) => r.json())
          .then((d) => {
            if (d.actions) setActions(d.actions);
          })
          .catch(() => {});
      }
    } catch {
      // Error
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className="h-6 w-6 text-red-500" />
          <span>Moderation Queue</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review community reports, handle academic dishonesty flags, and manage
          discussion states with an immutable audit log.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "pending"
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <span>Pending Reports</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-red-500 text-white">
            {flags.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "audit"
              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Moderation Audit Trail</span>
        </button>
      </div>

      {/* Pending Flags Tab */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {flags.map((flag) => {
            const targetType = flag.postId
              ? "POST"
              : flag.answerId
              ? "ANSWER"
              : "COMMENT";
            const targetId = flag.postId || flag.answerId || flag.commentId || "";

            return (
              <div
                key={flag.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase font-mono text-[10px]">
                      {flag.reason}
                    </span>
                    <span className="text-slate-400">
                      Target: {targetType} #{targetId.slice(-6)}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    Reported by {flag.reporter.name} {formatRelativeTime(flag.createdAt)}
                  </span>
                </div>

                {/* Content Details */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 text-xs space-y-1">
                  {flag.post && (
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Title: {flag.post.title}
                    </p>
                  )}
                  {flag.answer && (
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                      Answer: {flag.answer.body}
                    </p>
                  )}
                  {flag.comment && (
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                      Comment: {flag.comment.body}
                    </p>
                  )}
                  {flag.description && (
                    <p className="italic text-slate-500 dark:text-slate-400 pt-1">
                      Reporter note: &ldquo;{flag.description}&rdquo;
                    </p>
                  )}
                </div>

                {/* Moderation Actions Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  {flag.postId && (
                    <Link
                      href={`/${instituteCode}/knowledge-exchange/post/${flag.postId}`}
                      target="_blank"
                      className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      View Thread in New Tab →
                    </Link>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {flag.postId && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerationAction({
                              actionType: "LOCK",
                              targetType: "POST",
                              targetId: flag.postId!,
                              reason: "Locked due to user report",
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <Lock className="h-3 w-3" />
                          <span>Lock</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleModerationAction({
                              actionType: "CLOSE",
                              targetType: "POST",
                              targetId: flag.postId!,
                              reason: "Closed by instructor moderation",
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <span>Close</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleModerationAction({
                          actionType: "DELETE",
                          targetType,
                          targetId,
                          postId: flag.postId || undefined,
                          reason: `Content deleted: ${flag.reason}`,
                        })
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Content</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {flags.length === 0 && (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-slate-400 text-sm">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p>Moderation queue is empty. No pending flags!</p>
            </div>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Moderator</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {actions.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {formatRelativeTime(act.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {act.moderator.name} ({act.moderator.role})
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {act.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {act.targetType} #{act.targetId.slice(-6)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {act.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {actions.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              No recorded moderation actions yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
