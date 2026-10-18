"use client";

import { useState, useEffect, useCallback } from "react";
import { KxPostSummary } from "../types";

export function useKxSearch(initialQuery = "", debounceMs = 300) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<KxPostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-exchange/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        throw new Error("Failed to perform search");
      }
      const data = await res.json();
      setResults(data.posts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      search(query);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [query, debounceMs, search]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
}
