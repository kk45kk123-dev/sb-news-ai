"use client";

import * as React from "react";

const STORAGE_KEY = "sb-news-recent-searches";
const LIMIT = 8;

export function useRecentSearches() {
  const [recent, setRecent] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, []);

  const addRecent = React.useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, LIMIT);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecent = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRecent([]);
  }, []);

  const removeRecent = React.useCallback((query: string) => {
    setRecent((prev) => {
      const next = prev.filter((q) => q !== query);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recent, addRecent, clearRecent, removeRecent };
}
