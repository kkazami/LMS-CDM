"use client";

import { useState, useEffect, useCallback } from "react";
import { KxPostSummary, KxPostSortOption } from "../types";

interface UseKxPostsOptions {
  tag?: string;
  courseId?: string;
  sort?: KxPostSortOption;
  unansweredOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export function useKxPosts(initialOptions: UseKxPostsOptions = {}) {
  const [posts, setPosts] = useState<KxPostSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialOptions.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (options: UseKxPostsOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.tag) params.set("tag", options.tag);
      if (options.courseId) params.set("courseId", options.courseId);
      if (options.sort) params.set("sort", options.sort);
      if (options.unansweredOnly) params.set("unansweredOnly", "true");
      if (options.search) params.set("search", options.search);
      if (options.page) params.set("page", options.page.toString());
      if (options.limit) params.set("limit", options.limit.toString());

      const res = await fetch(`/api/knowledge-exchange/posts?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load questions");
      }
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(initialOptions);
  }, [fetchPosts, initialOptions.tag, initialOptions.courseId, initialOptions.sort, initialOptions.unansweredOnly, initialOptions.search, initialOptions.page]);

  return {
    posts,
    total,
    page,
    totalPages,
    loading,
    error,
    refetch: fetchPosts,
  };
}
