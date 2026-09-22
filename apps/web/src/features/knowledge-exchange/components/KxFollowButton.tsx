"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

interface KxFollowButtonProps {
  targetType: "POST" | "TAG";
  targetId: string;
  className?: string;
}

export function KxFollowButton({ targetType, targetId, className = "" }: KxFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/knowledge-exchange/follow?targetType=${targetType}&targetId=${targetId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setIsFollowing(data.isFollowing);
        }
      } catch (err) {
        console.error("Failed to check follow status:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    checkStatus();
    return () => {
      mounted = false;
    };
  }, [targetType, targetId]);

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      const res = await fetch("/api/knowledge-exchange/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      } else {
        setIsFollowing(prev);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setIsFollowing(prev);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground opacity-60 ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
        isFollowing
          ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      } ${className}`}
      title={isFollowing ? "Unfollow updates" : "Follow updates"}
    >
      {isFollowing ? (
        <>
          <BellOff className="w-3.5 h-3.5" />
          Following
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5" />
          Follow
        </>
      )}
    </button>
  );
}
