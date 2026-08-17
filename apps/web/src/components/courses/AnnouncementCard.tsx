"use client";

import type { InstituteTheme } from "@/lib/theme";
import { Clock, Edit2, Trash2, Check, X } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import UserMiniCard from "@/components/common/UserMiniCard";
import { useState } from "react";
import { useParams } from "next/navigation";

interface AnnouncementCardProps {
  announcement: {
    id: string;
    content: string;
    createdAt: string | Date;
    author: { id: string; name: string; avatarUrl: string | null };
  };
  theme: InstituteTheme;
  canEditDelete?: boolean;
  onUpdate?: (id: string, newContent: string) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
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

export default function AnnouncementCard({
  announcement,
  theme,
  canEditDelete = false,
  onUpdate,
  onDelete,
}: AnnouncementCardProps) {
  const [miniCard, setMiniCard] = useState<{ userId: string; anchorRect: DOMRect } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(announcement.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const params = useParams();
  const instituteCode = params.institute as string;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    if (!onUpdate) return;
    setIsSubmitting(true);
    setErrorMsg("");
    const res = await onUpdate(announcement.id, editContent);
    setIsSubmitting(false);
    if (res.success) {
      setIsEditing(false);
    } else {
      setErrorMsg(res.error || "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) {
      setIsSubmitting(true);
      const res = await onDelete(announcement.id);
      setIsSubmitting(false);
      if (!res.success) {
        alert(res.error || "Failed to delete");
      }
    }
  };

  const isCodeLabMilestone = announcement.content.includes("CodeLab Milestone");

  return (
    <div
      className={`rounded-2xl border p-5 transition-all shadow-xs ${
        isCodeLabMilestone
          ? "bg-gradient-to-br from-indigo-500/10 via-white dark:via-[#141721] to-amber-500/10 border-indigo-500/30"
          : "bg-white dark:bg-[#141721] border-slate-200/80 dark:border-white/5"
      }`}
    >
      <div className="flex gap-3.5">
        <UserAvatar
          name={announcement.author.name}
          avatarUrl={announcement.author.avatarUrl}
          size="md"
          color={theme.colors.primary}
          onClick={(e: React.MouseEvent) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMiniCard({ userId: announcement.author.id, anchorRect: rect });
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                {announcement.author.name}
              </span>
              {isCodeLabMilestone && (
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                  CodeLab Milestone
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-[#8B92A5]">
                <Clock className="h-3 w-3" />
                {timeAgo(announcement.createdAt)}
              </span>
            </div>

            {canEditDelete && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isSubmitting}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Edit Announcement"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete Announcement"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-slate-900 dark:text-[#F0F2F8] p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(announcement.content);
                  }}
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-md border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editContent.trim()}
                  className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-700 dark:text-[#D1D5DB] whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </div>
          )}
        </div>
      </div>
      
      {miniCard && (
        <UserMiniCard
          userId={miniCard.userId}
          instituteCode={instituteCode}
          anchorRect={miniCard.anchorRect}
          onClose={() => setMiniCard(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
