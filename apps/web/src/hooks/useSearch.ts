"use client";

import { useState, useCallback, useTransition } from "react";

export function useSearch(endpoint: string, debounceMs = 280) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<unknown[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = useCallback(
    (val: string) => {
      setQuery(val);
      if (!val.trim()) {
        setResults([]);
        return;
      }
      const timer = setTimeout(() => {
        startTransition(async () => {
          try {
            const res = await fetch(`${endpoint}?q=${encodeURIComponent(val)}`);
            if (res.ok) {
              const data = await res.json();
              setResults(data);
            }
          } catch {
            // Handled gracefully
          }
        });
      }, debounceMs);

      return () => clearTimeout(timer);
    },
    [endpoint, debounceMs]
  );

  return { query, handleSearch, results, isPending };
}
