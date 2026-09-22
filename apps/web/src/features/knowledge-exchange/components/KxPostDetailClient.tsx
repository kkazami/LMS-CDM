"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import KxPostDetail from "./KxPostDetail";
import type { KxPostItem } from "../types";

interface KxPostDetailClientProps {
  postId: string;
  instituteCode: string;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  initialPost?: KxPostItem | null;
}

export default function KxPostDetailClient({
  postId,
  instituteCode,
  currentUserId,
  currentUserRole,
  currentUserAvatar,
  currentUserName,
  initialPost = null,
}: KxPostDetailClientProps) {
  const [post, setPost] = useState<KxPostItem | null>(initialPost);
  const [loading, setLoading] = useState<boolean>(!initialPost);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Fetch from API if initialPost was not provided (e.g. client mock routes or fallback)
    if (!initialPost) {
      setLoading(true);
      fetch(`/api/knowledge-exchange/posts/${postId}`)
        .then(async (res) => {
          if (!res.ok) {
            if (active) setError("Post not found");
            return;
          }
          const data = await res.json();
          if (active && data?.post) {
            setPost(data.post);
          }
        })
        .catch(() => {
          if (active) setError("Failed to load post");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [postId, initialPost]);

  if (loading && !post) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Loading discussion...
        </p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Post Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The requested discussion could not be found or may have been deleted.
        </p>
      </div>
    );
  }

  return (
    <KxPostDetail
      post={post}
      instituteCode={instituteCode}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      currentUserAvatar={currentUserAvatar}
      currentUserName={currentUserName}
    />
  );
}
