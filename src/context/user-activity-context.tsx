"use client";

import * as React from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/http";
import { setBookmark as apiSetBookmark } from "@/lib/api/news";

interface UserActivityState {
  bookmarkedIds: string[];
  likedIds: string[];
  recentlyViewedIds: string[];
}

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
  isLoggedIn: boolean;
  /** Shows a "로그인이 필요합니다" toast and returns false when logged out — call before any mutating action. */
  requireLogin: () => boolean;
}

const UserActivityContext = React.createContext<UserActivityContextValue | null>(null);

/**
 * Bookmarks/likes/recently-viewed now live in Postgres (UserArticleState),
 * tied to the real session — this used to be a pure localStorage mock with
 * no account concept at all, so anonymous visitors get empty state here
 * (browsing itself stays open; only these three lists require login).
 */
export function UserActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<UserActivityState>(EMPTY_STATE);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<UserActivityState>("/api/v1/articles/my-activity");
      setState(data);
    } catch {
      setState(EMPTY_STATE);
    }
  }, []);

  React.useEffect(() => {
    // /api/v1/auth/me is the actual source of truth for "logged in" (my-activity
    // returns 200 with empty arrays either way) — check it once so requireLogin()
    // doesn't have to guess from empty-vs-populated activity lists.
    apiFetch("/api/v1/auth/me")
      .then(() => {
        setIsLoggedIn(true);
        refresh();
      })
      .catch(() => setIsLoggedIn(false));
  }, [refresh]);

  const requireLogin = React.useCallback(() => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다.");
      return false;
    }
    return true;
  }, [isLoggedIn]);

  const toggleBookmark = React.useCallback(
    (id: string) => {
      if (!requireLogin()) return;
      const wasBookmarked = state.bookmarkedIds.includes(id);
      setState((s) => ({
        ...s,
        bookmarkedIds: wasBookmarked ? s.bookmarkedIds.filter((x) => x !== id) : [...s.bookmarkedIds, id],
      }));
      apiSetBookmark(id, !wasBookmarked).catch(() => {
        setState((s) => ({
          ...s,
          bookmarkedIds: wasBookmarked ? [...s.bookmarkedIds, id] : s.bookmarkedIds.filter((x) => x !== id),
        }));
        toast.error("북마크 저장에 실패했습니다.");
      });
    },
    [state.bookmarkedIds, requireLogin]
  );

  const toggleLike = React.useCallback(
    (id: string) => {
      // Persistence + count are handled by useLikeMutation (src/lib/query/use-news.ts) —
      // this just flips the local "am I liking this" flag LikeButton reads.
      setState((s) => ({
        ...s,
        likedIds: s.likedIds.includes(id) ? s.likedIds.filter((x) => x !== id) : [...s.likedIds, id],
      }));
    },
    []
  );

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
      isLoggedIn,
      requireLogin,
    }),
    [state, toggleBookmark, toggleLike, addRecentlyViewed, isLoggedIn, requireLogin]
  );

  return <UserActivityContext.Provider value={value}>{children}</UserActivityContext.Provider>;
}

export function useUserActivity(): UserActivityContextValue {
  const ctx = React.useContext(UserActivityContext);
  if (!ctx) throw new Error("useUserActivity must be used within UserActivityProvider");
  return ctx;
}
