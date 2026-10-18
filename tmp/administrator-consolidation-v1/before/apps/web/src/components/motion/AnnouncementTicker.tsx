"use client";

interface AnnouncementTickerProps {
  announcements: { id: string; title: string }[];
}

export function AnnouncementTicker({ announcements }: AnnouncementTickerProps) {
  if (!announcements || announcements.length === 0) return null;
  const text = announcements.map((a) => a.title).join("  •  ");

  return (
    <div
      className="relative overflow-hidden border-y border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.015] py-2"
      role="marquee"
      aria-label="Latest announcements"
      aria-live="off"
    >
      <div className="animate-ticker flex whitespace-nowrap">
        <span className="text-xs font-medium text-slate-500 dark:text-[#8B92A5] pr-16">
          {text}
        </span>
        <span
          className="text-xs font-medium text-slate-500 dark:text-[#8B92A5] pr-16"
          aria-hidden="true"
        >
          {text}
        </span>
      </div>
    </div>
  );
}
