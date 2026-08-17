"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Megaphone,
  GraduationCap,
  ClipboardCheck,
  CheckCheck,
  Inbox,
  Clock,
  AlertTriangle,
  Radio,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  theme: InstituteTheme;
}

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "ANNOUNCEMENT":
      return <Megaphone className="h-4 w-4 text-blue-500" />;
    case "GRADE":
      return <GraduationCap className="h-4 w-4 text-green-500" />;
    case "CLASSWORK":
      return <ClipboardCheck className="h-4 w-4 text-orange-500" />;
    case "REMINDER":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "ALERT":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "BROADCAST":
      return <Radio className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

export default function NotificationBell({ theme }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Also fetch when opening the panel
  const handleToggle = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      fetchNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Click a notification: mark read + navigate
  const handleClickNotification = async (notification: NotificationItem) => {
    // Mark as read optimistically
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    if (!notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Mark as read on server
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", id: notification.id }),
      });
    } catch {
      // silent
    }

    setIsOpen(false);

    // Navigate if link is provided
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={handleToggle}
        className="relative rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 min-w-[36px] min-h-[36px]"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white shadow-xs animate-in"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-[#1A1D27] shadow-xl border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 dark:ring-0 transition-all duration-200 origin-top-right z-50 ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ transformOrigin: "top right" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Notifications</h3>
          {unreadCount > 0 && (
            <button
              id="notification-mark-all-read"
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline disabled:opacity-50"
              style={{ color: theme.colors.primary }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-400 dark:text-[#8B92A5]">No notifications yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                You&#39;ll be notified about announcements, grades, and new classwork
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                id={`notification-${n.id}`}
                onClick={() => handleClickNotification(n)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-white/5 last:border-b-0"
                style={{
                  backgroundColor: n.isRead ? "transparent" : `${theme.colors.primary}06`,
                }}
              >
                {/* Type icon */}
                <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        n.isRead ? "text-slate-600 dark:text-[#8B92A5]" : "text-slate-900 dark:text-[#F0F2F8] font-semibold"
                      }`}
                    >
                      {n.message}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div
                    className="h-2 w-2 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
