"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, Loader2, Sparkles, MessageSquare, ThumbsUp, CheckCircle2, Award, Info } from "lucide-react";
import Link from "next/link";
import { KxNotificationItem, KxNotificationType } from "../types";

interface KxNotificationPanelProps {
  institute: string;
}

export function KxNotificationPanel({ institute }: KxNotificationPanelProps) {
  const [notifications, setNotifications] = useState<KxNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge-exchange/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/knowledge-exchange/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationId: id } : { all: true }),
      });

      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const getIcon = (type: KxNotificationType) => {
    switch (type) {
      case "ANSWER_POSTED":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "UPVOTE_RECEIVED":
        return <ThumbsUp className="w-4 h-4 text-amber-500" />;
      case "ANSWER_ACCEPTED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "ANSWER_VERIFIED":
        return <Award className="w-4 h-4 text-primary" />;
      case "WEEKLY_DIGEST":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        title="Knowledge Exchange Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-xs text-foreground">KX Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto divide-y divide-border/50 flex-1">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors flex items-start gap-3 ${
                    !n.isRead ? "bg-primary/[0.03]" : "hover:bg-muted/40"
                  }`}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n.id);
                  }}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-foreground line-clamp-2 ${!n.isRead ? "font-semibold" : ""}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      {n.targetId && (
                        <Link
                          href={`/${institute}/knowledge-exchange/post/${n.targetId}`}
                          onClick={() => setIsOpen(false)}
                          className="text-primary hover:underline font-medium"
                        >
                          View thread
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
