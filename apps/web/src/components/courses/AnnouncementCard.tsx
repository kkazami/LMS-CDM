"use client";

import type { InstituteTheme } from "@/lib/theme";
import { Clock } from "lucide-react";

interface AnnouncementCardProps {
  announcement: {
    id: string;
    content: string;
    createdAt: string | Date;
    author: { name: string };
  };
  theme: InstituteTheme;
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
}: AnnouncementCardProps) {
  const initial = announcement.author.name.charAt(0).toUpperCase();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: theme.colors.primary }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {announcement.author.name}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {timeAgo(announcement.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </p>
        </div>
      </div>
    </div>
  );
}
