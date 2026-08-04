import * as store from "@/lib/api/news-store";
import { networkDelay } from "@/lib/api/shared";
import {
  newsListParamsSchema,
  newsListResponseSchema,
  newsSchema,
  type News,
  type NewsListParams,
  type NewsListResponse,
} from "@/lib/schemas/news.schema";

function publishedOnly(items: News[]): News[] {
  return items.filter((n) => n.status === "published");
}

function applyFilters(items: News[], params: NewsListParams): News[] {
  let result = items;
  if (params.categoryId) {
    result = result.filter((n) => n.categoryId === params.categoryId);
  }
  if (params.mediaId) {
    result = result.filter((n) => n.mediaId === params.mediaId);
  }
  if (params.query) {
    const q = params.query.toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.keywords.some((k) => k.toLowerCase().includes(q)) ||
        n.summaryBullets.some((s) => s.toLowerCase().includes(q))
    );
  }
  if (params.dateFrom) {
    result = result.filter((n) => n.publishedAt >= params.dateFrom!);
  }
  if (params.dateTo) {
    result = result.filter((n) => n.publishedAt <= params.dateTo!);
  }
  return result;
}

function applySort(items: News[], sort: NewsListParams["sort"]): News[] {
  const copy = [...items];
  if (sort === "views") return copy.sort((a, b) => b.viewCount - a.viewCount);
  if (sort === "impact") return copy.sort((a, b) => b.aiImportance - a.aiImportance);
  return copy.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getNewsList(rawParams: Partial<NewsListParams> = {}): Promise<NewsListResponse> {
  const params = newsListParamsSchema.parse(rawParams);
  await networkDelay();

  const filtered = applySort(applyFilters(publishedOnly(store.listAll()), params), params.sort);
  const start = (params.page - 1) * params.pageSize;
  const pageItems = filtered.slice(start, start + params.pageSize);

  return newsListResponseSchema.parse({
    items: pageItems,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: start + pageItems.length < filtered.length,
  });
}

export async function getNewsDetail(id: string): Promise<News | null> {
  await networkDelay(250);
  const item = store.findById(id);
  return item ? newsSchema.parse(item) : null;
}

export async function getRelatedNews(id: string, limit = 4): Promise<News[]> {
  await networkDelay(200);
  const current = store.findById(id);
  if (!current) return [];
  return publishedOnly(store.listAll())
    .filter((n) => n.id !== id && n.categoryId === current.categoryId)
    .slice(0, limit);
}

export async function getSameTopicNews(id: string, limit = 4): Promise<News[]> {
  await networkDelay(200);
  const current = store.findById(id);
  if (!current) return [];
  return publishedOnly(store.listAll())
    .filter((n) => n.id !== id && n.categoryId !== current.categoryId && n.tags.some((t) => current.tags.includes(t)))
    .slice(0, limit);
}

export async function getPopularNews(limit = 5): Promise<News[]> {
  await networkDelay(200);
  return applySort(publishedOnly(store.listAll()), "views").slice(0, limit);
}

export async function getAiRecommendedNews(limit = 4): Promise<News[]> {
  await networkDelay(200);
  return publishedOnly(store.listAll())
    .filter((n) => n.isAiRecommended)
    .slice(0, limit);
}

export async function getNewsByIds(ids: string[]): Promise<News[]> {
  await networkDelay(200);
  const byId = new Map(store.listAll().map((n) => [n.id, n] as const));
  return ids.map((id) => byId.get(id)).filter((n): n is News => !!n);
}

export async function incrementView(id: string): Promise<void> {
  store.bumpView(id);
}

export async function setLike(id: string, liked: boolean): Promise<number> {
  await networkDelay(150);
  return store.setLike(id, liked);
}
