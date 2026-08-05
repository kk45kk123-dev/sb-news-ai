import { z } from "zod";
import {
  listArticles,
  findArticleWithRelations,
  type ArticleWithRelations,
} from "@/server/repositories/article.repository";
import {
  getStatesForArticles,
  getState,
} from "@/server/repositories/user-article-state.repository";

const DEFAULT_LIST_WINDOW_DAYS = 30; // §17.1: 목록 쿼리는 항상 날짜 범위로 제한
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100; // §18.1: 모든 목록 API에 상한

export const listArticlesQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  categories: z.string().optional(), // 콤마 구분 slug 목록
  sources: z.string().optional(), // 콤마 구분 source id 목록
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_impact: z.coerce.number().int().min(1).max(5).optional(),
  unread_only: z.coerce.boolean().optional(),
  bookmarked_only: z.coerce.boolean().optional(),
  sort: z.enum(["impact", "recent", "importance"]).default("impact"),
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;

export interface ArticleDto {
  id: string;
  title: string;
  description: string | null;
  url: string;
  publisher: string | null;
  publishedAt: string;
  imageUrl: string | null;
  isPaywalled: boolean;
  isRead: boolean;
  isBookmarked: boolean;
  memo: string | null;
  source: { id: string; name: string };
  categories: { name: string; slug: string; rank: number }[];
  analysis: {
    summaryLines: string[];
    keywords: string[];
    importance: number;
    sbImpactScore: number;
    sbImpactDirection: string;
    sbImpactReason: string;
    customerImpact: string | null;
    digitalImpact: string | null;
    risks: string[];
    actionIdeas: string[];
    aiComment: string | null;
    evidence: unknown;
    confidence: string;
  } | null;
}

export function toArticleDto(
  article: ArticleWithRelations,
  userState?: { isRead: boolean; isBookmarked: boolean; memo: string | null }
): ArticleDto {
  const analysis = article.analyses[0];
  return {
    id: article.id,
    title: article.title,
    description: article.description,
    url: article.url,
    publisher: article.publisher,
    publishedAt: article.publishedAt.toISOString(),
    imageUrl: article.imageUrl,
    isPaywalled: article.isPaywalled,
    isRead: userState?.isRead ?? false,
    isBookmarked: userState?.isBookmarked ?? false,
    memo: userState?.memo ?? null,
    source: { id: article.source.id, name: article.source.name },
    categories: article.categories.map((c) => ({
      name: c.category.name,
      slug: c.category.slug,
      rank: c.rank,
    })),
    analysis: analysis
      ? {
          summaryLines: analysis.summaryLines,
          keywords: analysis.keywords,
          importance: analysis.importance,
          sbImpactScore: analysis.sbImpactScore,
          sbImpactDirection: analysis.sbImpactDirection,
          sbImpactReason: analysis.sbImpactReason,
          customerImpact: analysis.customerImpact,
          digitalImpact: analysis.digitalImpact,
          risks: analysis.risks,
          actionIdeas: analysis.actionIdeas,
          aiComment: analysis.aiComment,
          evidence: analysis.evidence,
          confidence: analysis.confidence,
        }
      : null,
  };
}

export async function listArticlesForOrg(
  orgId: string,
  query: ListArticlesQuery,
  userId?: string
): Promise<{ items: ArticleDto[]; total: number; nextCursor: number | null }> {
  const dateTo = query.date_to ? new Date(query.date_to) : new Date();
  const dateFrom = query.date_from
    ? new Date(query.date_from)
    : new Date(dateTo.getTime() - DEFAULT_LIST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { items, total } = await listArticles({
    orgId,
    q: query.q,
    categorySlugs: query.categories?.split(",").filter(Boolean),
    sourceIds: query.sources?.split(",").filter(Boolean),
    dateFrom,
    dateTo,
    minImpact: query.min_impact,
    unreadOnly: query.unread_only,
    bookmarkedOnly: query.bookmarked_only,
    sort: query.sort,
    offset: query.cursor,
    limit: query.limit,
    userId,
  });

  const states = userId ? await getStatesForArticles(userId, items.map((a) => a.id)) : new Map();

  const nextOffset = query.cursor + items.length;
  return {
    items: items.map((a) => toArticleDto(a, states.get(a.id))),
    total,
    nextCursor: nextOffset < total ? nextOffset : null,
  };
}

export async function getArticleDetail(id: string, orgId: string, userId?: string): Promise<ArticleDto | null> {
  const article = await findArticleWithRelations(id, orgId);
  if (!article) return null;
  const state = userId ? await getState(userId, id) : null;
  return toArticleDto(article, state ?? undefined);
}
