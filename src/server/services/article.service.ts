import { z } from "zod";
import {
  listArticles,
  findArticleWithRelations,
  findRelatedArticles,
  findSameTopicArticles,
  findPopularArticles,
  findArticlesByIds,
  type ArticleWithRelations,
} from "@/server/repositories/article.repository";
import { getCategoryGradient } from "@/data/categories";
import { newsSchema, type News } from "@/lib/schemas/news.schema";

// NOTE: this file used to also define a separate ArticleDto/listArticlesForOrg/
// getArticleDetail vertical for the automated-collector-pipeline's own detail
// shape (categories as real Category rows, isRead/isBookmarked/memo inline).
// It had zero live callers — /api/v1/articles* was rewired to the mock-shaped
// News DTO below during the Sprint 2 mock->real-DB migration — so it was
// removed rather than left to bit-rot alongside a differently-typed sort enum.
// listArticles()/findArticleWithRelations() (still below, in article.repository.ts)
// remain shared by both the dormant pipeline and this public-facing path.

/**
 * Reshapes a real Article+Analysis row into the site's mock News contract
 * (src/lib/schemas/news.schema.ts) so every existing UI component — built
 * against that shape during the mock-UI migration — keeps working unchanged
 * against real data. See Article.categoryId/viewCount/likeCount/status field
 * comments in schema.prisma for why those columns exist. Bookmark/like state
 * isn't part of this shape (the mock kept it in a separate client-side
 * activity context, now backed by /api/v1/articles/my-activity).
 */
export function toNewsDto(article: ArticleWithRelations): News {
  const analysis = article.analyses[0];
  const categoryId = article.categoryId ?? "c8";
  const isExternal = !article.url.startsWith("internal://");
  const summaryBullets = analysis?.summaryLines.length === 3 ? analysis.summaryLines : ["", "", ""];

  return newsSchema.parse({
    id: article.id,
    slug: article.id,
    title: article.title,
    thumbnailGradient: getCategoryGradient(categoryId),
    mediaId: isExternal ? "m-external" : "m-direct",
    reporter: article.author ?? "관리자 등록",
    publishedAt: article.publishedAt.toISOString(),
    viewCount: article.viewCount,
    likeCount: article.likeCount,
    categoryId,
    tags: analysis?.keywords ?? [],
    summaryBullets,
    body: article.rawContent ?? "",
    keywords: analysis?.keywords ?? [],
    aiImportance: analysis?.importance ?? 3,
    financialImpact: analysis?.sbImpactScore ?? 3,
    savingsBankImpact: analysis?.sbImpactScore ?? 3,
    aiConfidence: analysis?.confidence ?? "low",
    isAiRecommended: (analysis?.importance ?? 0) >= 4,
    status: article.status,
    scheduledAt: article.scheduledAt?.toISOString() ?? null,
    sourceUrl: isExternal ? article.url : null,
  });
}

export const publicNewsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
  categoryId: z.string().optional(),
  query: z.string().trim().min(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["latest", "views", "impact"]).default("latest"),
  aiOnly: z.coerce.boolean().optional(),
  /** Admin-only — includes draft/scheduled articles. The route re-derives this from the
   *  session role rather than trusting the client value, so coercing a client-sent string
   *  is safe here (worst case a non-admin's "true" gets overridden back to false). */
  includeAllStatuses: z.coerce.boolean().optional(),
});
export type PublicNewsListQuery = z.infer<typeof publicNewsListQuerySchema>;

const PUBLIC_LIST_WINDOW_DAYS = 3650; // reader-facing lists have no natural "recent window" — show everything

export async function listPublicNews(
  orgId: string,
  query: PublicNewsListQuery
): Promise<{ items: News[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
  const dateFrom = query.dateFrom
    ? new Date(query.dateFrom)
    : new Date(dateTo.getTime() - PUBLIC_LIST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { items, total } = await listArticles({
    orgId,
    q: query.query,
    dateFrom,
    dateTo,
    sort: query.sort,
    categoryId: query.categoryId,
    aiRecommendedOnly: query.aiOnly,
    statuses: query.includeAllStatuses ? undefined : ["published"],
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
  });

  return {
    items: items.map((a) => toNewsDto(a)),
    total,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: query.page * query.pageSize < total,
  };
}

export async function getPublicNewsDetail(id: string, orgId: string, userId?: string): Promise<News | null> {
  const article = await findArticleWithRelations(id, orgId);
  if (!article || (article.status !== "published" && !userId)) return null;
  return toNewsDto(article);
}

export async function getRelatedPublicNews(id: string, orgId: string, limit = 4): Promise<News[]> {
  const current = await findArticleWithRelations(id, orgId);
  if (!current) return [];
  const related = await findRelatedArticles(orgId, current.categoryId ?? "c8", id, limit);
  return related.map((a) => toNewsDto(a));
}

export async function getSameTopicPublicNews(id: string, orgId: string, limit = 4): Promise<News[]> {
  const current = await findArticleWithRelations(id, orgId);
  if (!current) return [];
  const keywords = current.analyses[0]?.keywords ?? [];
  const sameTopic = await findSameTopicArticles(orgId, current.categoryId, keywords, id, limit);
  return sameTopic.map((a) => toNewsDto(a));
}

export async function getPopularPublicNews(orgId: string, limit = 5): Promise<News[]> {
  const items = await findPopularArticles(orgId, limit);
  return items.map((a) => toNewsDto(a));
}

export async function getPublicNewsByIds(orgId: string, ids: string[]): Promise<News[]> {
  const items = await findArticlesByIds(orgId, ids);
  const byId = new Map(items.map((a) => [a.id, toNewsDto(a)] as const));
  return ids.map((id) => byId.get(id)).filter((n): n is News => !!n);
}
