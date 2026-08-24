"use client";

import * as React from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/http";
import { setBookmark as apiSetBookmark } from "@/lib/api/news";
import { useAuth } from "@/context/auth-context";

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
 *
 * "로그인이 필요합니다" 오탐 버그: 예전엔 이 프로바이더가 마운트 시 딱 한 번만
 * /api/v1/auth/me를 따로 호출해 자기만의 isLoggedIn을 갖고 있었다 — 로그인
 * 화면에서 로그인해서 AuthProvider의 user는 즉시 갱신되고 헤더엔 로그인
 * 상태로 보이는데, 페이지를 새로고침하지 않으면 이 프로바이더의 isLoggedIn은
 * 로그인 전 값(false)에 멈춰 있어 좋아요/북마크를 누르면 로그인했는데도
 * "로그인이 필요합니다"가 떴다. AuthProvider(useAuth)의 user를 유일한 진실
 * 공급원으로 삼아 파생시키면 로그인/로그아웃 즉시 함께 갱신된다.
 */
export function UserActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [state, setState] = React.useState<UserActivityState>(EMPTY_STATE);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<UserActivityState>("/api/v1/articles/my-activity");
      setState(data);
    } catch {
      setState(EMPTY_STATE);
    }
  }, []);

  React.useEffect(() => {
    if (isLoggedIn) {
      refresh();
    } else {
      setState(EMPTY_STATE);
    }
  }, [isLoggedIn, refresh]);

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
