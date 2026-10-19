"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Megaphone,
  GraduationCap,
  ClipboardCheck,
  CheckCheck,
  Check,
  Inbox,
  Clock,
  AlertTriangle,
  Radio,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import GoogleMeetLinks from "@/components/courses/GoogleMeetLinks";
import { googleMeetLinks } from "@/lib/academic-structure/meeting-links";

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
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const notificationRequest = useRef<AbortController | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (notificationRequest.current && !notificationRequest.current.signal.aborted) return;
    const controller = new AbortController();
    notificationRequest.current = controller;
    try {
      const res = await fetch("/api/notifications?limit=20", { signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      if (controller.signal.aborted) return;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      if (!controller.signal.aborted) console.error("Failed to fetch notifications", err);
    } finally {
      if (notificationRequest.current === controller) notificationRequest.current = null;
    }
  }, []);

  // Initial fetch + polling every 30 seconds, paused while the tab is hidden
  // and refreshed immediately when it becomes visible again.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      if (document.visibilityState === "visible" && (typeof navigator === "undefined" || navigator.onLine)) {
        void fetchNotifications();
      }
    };
    const start = () => {
      if (interval === undefined) interval = setInterval(refresh, 30000);
    };
    const stop = () => {
      if (interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        refresh();
        start();
      }
    };

    refresh();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", refresh);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", refresh);
      notificationRequest.current?.abort();
    };
  }, [fetchNotifications]);

  const pathname = usePathname();

  // Close panel whenever route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Esc and return focus to the bell
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        bellButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Close on outside click or touch
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
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
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
        keepalive: true,
      });
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to mark all read", err);
      fetchNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  // Mark an individual notification as read without navigating
  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", id }),
        keepalive: true,
      });
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to mark notification read", err);
      fetchNotifications();
    }
  };

  const markNotificationRead = (notification: NotificationItem) => {
    if (!notification.isRead) {
      // Mark as read optimistically
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Mark as read on server with keepalive: true so browser navigation doesn't abort it
      try {
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead", id: notification.id }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // silent
      }
    }
  };

  // Click a notification: mark read + navigate
  const handleClickNotification = (notification: NotificationItem) => {
    markNotificationRead(notification);
    setIsOpen(false);

    // Navigate if link is provided
    if (notification.link) {
      let targetLink = notification.link;
      if (targetLink.includes("/activities/codelab") && !targetLink.includes("alertId=")) {
        targetLink += (targetLink.includes("?") ? "&" : "?") + `alertId=${notification.id}`;
      }
      router.push(targetLink);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        ref={bellButtonRef}
        onClick={handleToggle}
        className="relative rounded-lg sm:rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#22263A] p-1 sm:p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-xs active:scale-95 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center shrink-0"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 grid h-3.5 w-3.5 sm:h-5 sm:w-5 place-items-center rounded-full text-[8px] sm:text-[10px] font-bold text-white shadow-xs animate-in"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <div
        inert={!isOpen}
        aria-hidden={!isOpen}
        className={`absolute -right-8 sm:right-0 mt-2 w-[min(340px,calc(100vw-24px))] sm:w-96 rounded-xl bg-white dark:bg-[#1A1D27] shadow-xl border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 dark:ring-0 transition-all duration-200 origin-top-right z-50 ${
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
              <div
                key={n.id}
                id={`notification-${n.id}`}
                onClick={() => handleClickNotification(n)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-white/5 last:border-b-0 cursor-pointer group"
                style={{
                  backgroundColor: n.isRead ? "transparent" : `${theme.colors.primary}06`,
                }}
              >
                {/* Type icon */}
                <div className="mt-1 shrink-0">{getNotificationIcon(n.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold ${
                      n.isRead ? "text-slate-600 dark:text-[#8B92A5]" : "text-slate-900 dark:text-[#F0F2F8]"
                    }`}
                  >
                    {n.title || n.type}
                  </p>
                  <p
                    className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${
                      n.isRead ? "text-slate-500 dark:text-[#8B92A5]" : "text-slate-800 dark:text-[#D1D5DB] font-medium"
                    }`}
                  >
                    {n.message}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">{timeAgo(n.createdAt)}</p>
                  <div onClick={(event) => {
                    event.stopPropagation();
                    markNotificationRead(n);
                  }}>
                    <GoogleMeetLinks links={googleMeetLinks(`${n.title}\n${n.message}\n${n.link}`)} />
                  </div>
                </div>

                {/* Unread indicator & Mark As Read Action */}
                {!n.isRead && (
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleMarkSingleRead(e, n.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/15 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/20 transition-all cursor-pointer"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
