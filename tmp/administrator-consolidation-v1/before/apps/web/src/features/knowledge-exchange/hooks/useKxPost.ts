"use client";

import { useState, useEffect, useCallback } from "react";
import { KxPostDetailData } from "../types";

export function useKxPost(postId: string) {
  const [post, setPost] = useState<KxPostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-exchange/posts/${postId}`);
      if (!res.ok) {
        throw new Error("Failed to load post");
      }
      const data = await res.json();
      setPost(data.post);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return {
    post,
    loading,
    error,
    refetch: fetchPost,
  };
}
