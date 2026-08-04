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
