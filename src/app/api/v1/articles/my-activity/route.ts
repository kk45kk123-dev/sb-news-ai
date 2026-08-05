import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import {
  listBookmarked,
  listLiked,
  listRecentlyViewed,
} from "@/server/repositories/user-article-state.repository";

const RECENTLY_VIEWED_LIMIT = 12; // matches the old localStorage mock's cap

/**
 * Replaces the old client-only UserActivityProvider's localStorage state
 * (bookmarkedIds/likedIds/recentlyViewedIds) with a real per-user query.
 * Anonymous visitors get empty arrays — browsing itself stays open with no
 * login wall, only these three activity lists require an account.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiOk({ bookmarkedIds: [], likedIds: [], recentlyViewedIds: [] });
  }

  const [bookmarked, liked, recent] = await Promise.all([
    listBookmarked(ctx.user.id),
    listLiked(ctx.user.id),
    listRecentlyViewed(ctx.user.id, RECENTLY_VIEWED_LIMIT),
  ]);

  return apiOk({
    bookmarkedIds: bookmarked.map((s) => s.articleId),
    likedIds: liked.map((s) => s.articleId),
    recentlyViewedIds: recent.map((s) => s.articleId),
  });
}
