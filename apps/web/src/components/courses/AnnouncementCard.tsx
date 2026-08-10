"use client";

import type { InstituteTheme } from "@/lib/theme";
import { Clock } from "lucide-react";
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
  const [miniCard, setMiniCard] = useState<{ userId: string; anchorRect: DOMRect } | null>(null);
  const params = useParams();
  const instituteCode = params.institute as string;

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex gap-3">
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
