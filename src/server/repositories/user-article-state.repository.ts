import { prisma } from "@/server/db/client";
import type { UserArticleState } from "@prisma/client";

export async function markAsRead(userId: string, articleId: string): Promise<void> {
  await prisma.userArticleState.upsert({
    where: { userId_articleId: { userId, articleId } },
    update: { isRead: true, readAt: new Date() },
    create: { userId, articleId, isRead: true, readAt: new Date() },
  });
}

export async function setBookmark(
  userId: string,
  articleId: string,
  bookmarked: boolean,
  folder?: string
): Promise<void> {
  await prisma.userArticleState.upsert({
    where: { userId_articleId: { userId, articleId } },
    update: { isBookmarked: bookmarked, bookmarkedAt: bookmarked ? new Date() : null, folder },
    create: { userId, articleId, isBookmarked: bookmarked, bookmarkedAt: bookmarked ? new Date() : null, folder },
  });
}

export async function setMemo(userId: string, articleId: string, memo: string): Promise<void> {
  await prisma.userArticleState.upsert({
    where: { userId_articleId: { userId, articleId } },
    update: { memo },
    create: { userId, articleId, memo },
  });
}

export async function getState(userId: string, articleId: string): Promise<UserArticleState | null> {
  return prisma.userArticleState.findUnique({ where: { userId_articleId: { userId, articleId } } });
}

export async function getStatesForArticles(
  userId: string,
  articleIds: string[]
): Promise<Map<string, UserArticleState>> {
  const states = await prisma.userArticleState.findMany({
    where: { userId, articleId: { in: articleIds } },
  });
  return new Map(states.map((s) => [s.articleId, s]));
}

export async function listBookmarked(userId: string, folder?: string): Promise<UserArticleState[]> {
  return prisma.userArticleState.findMany({
    where: { userId, isBookmarked: true, ...(folder ? { folder } : {}) },
    orderBy: { bookmarkedAt: "desc" },
  });
}

export async function listRecentlyViewed(userId: string, limit: number): Promise<UserArticleState[]> {
  return prisma.userArticleState.findMany({
    where: { userId, isRead: true },
    orderBy: { readAt: "desc" },
    take: limit,
  });
}

export async function listLiked(userId: string): Promise<UserArticleState[]> {
  return prisma.userArticleState.findMany({ where: { userId, isLiked: true }, orderBy: { likedAt: "desc" } });
}

/**
 * Toggles a user's like and atomically adjusts Article.likeCount in the same
 * transaction, mirroring the old news-store mock's setLike(id, liked) -> newCount
 * contract so the client-side optimistic-update code didn't need to change.
 */
export async function setLike(userId: string, articleId: string, liked: boolean): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const state = await tx.userArticleState.findUnique({ where: { userId_articleId: { userId, articleId } } });
    const wasLiked = state?.isLiked ?? false;

    if (wasLiked === liked) {
      const article = await tx.article.findUnique({ where: { id: articleId }, select: { likeCount: true } });
      return article?.likeCount ?? 0;
    }

    await tx.userArticleState.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { isLiked: liked, likedAt: liked ? new Date() : null },
      create: { userId, articleId, isLiked: liked, likedAt: liked ? new Date() : null },
    });

    const article = await tx.article.update({
      where: { id: articleId },
      data: { likeCount: { increment: liked ? 1 : -1 } },
      select: { likeCount: true },
    });
    return Math.max(0, article.likeCount);
  });
}
