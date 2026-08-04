"use client";

import * as React from "react";

interface UserActivityState {
  bookmarkedIds: string[];
  likedIds: string[];
  recentlyViewedIds: string[];
}

const STORAGE_KEY = "sb-news-activity";
const RECENTLY_VIEWED_LIMIT = 12;

const EMPTY_STATE: UserActivityState = { bookmarkedIds: [], likedIds: [], recentlyViewedIds: [] };

interface UserActivityContextValue {
  bookmarkedIds: string[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (id: string) => void;
  likedIds: string[];
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
  recentlyViewedIds: string[];
  addRecentlyViewed: (id: string) => void;
}

const UserActivityContext = React.createContext<UserActivityContextValue | null>(null);

/**
 * Client-only persisted activity state (bookmarks, likes, recently-viewed).
 * Backed by localStorage today; swap the two effects below for a Supabase
 * `user_article_states` table read/write once real accounts exist — every
 * consumer only talks to the functions this context exposes.
 */
export function UserActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<UserActivityState>(EMPTY_STATE);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY_STATE, ...JSON.parse(raw) });
    } catch {
      // ignore malformed storage
    }
    hydrated.current = true;
  }, []);

  React.useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleBookmark = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bookmarkedIds: s.bookmarkedIds.includes(id) ? s.bookmarkedIds.filter((x) => x !== id) : [...s.bookmarkedIds, id],
    }));
  }, []);

  const toggleLike = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      likedIds: s.likedIds.includes(id) ? s.likedIds.filter((x) => x !== id) : [...s.likedIds, id],
    }));
  }, []);

  const addRecentlyViewed = React.useCallback((id: string) => {
    setState((s) => ({
      ...s,
      recentlyViewedIds: [id, ...s.recentlyViewedIds.filter((x) => x !== id)].slice(0, RECENTLY_VIEWED_LIMIT),
    }));
  }, []);

  const value = React.useMemo<UserActivityContextValue>(
    () => ({
      bookmarkedIds: state.bookmarkedIds,
      isBookmarked: (id) => state.bookmarkedIds.includes(id),
      toggleBookmark,
      likedIds: state.likedIds,
      isLiked: (id) => state.likedIds.includes(id),
      toggleLike,
      recentlyViewedIds: state.recentlyViewedIds,
      addRecentlyViewed,
    }),
    [state, toggleBookmark, toggleLike, addRecentlyViewed]
  );

  return <UserActivityContext.Provider value={value}>{children}</UserActivityContext.Provider>;
}

export function useUserActivity(): UserActivityContextValue {
  const ctx = React.useContext(UserActivityContext);
  if (!ctx) throw new Error("useUserActivity must be used within UserActivityProvider");
  return ctx;
}
