import { apiFetch, ApiRequestError } from "@/lib/api/http";
import {
  newsListParamsSchema,
  type NewsListParams,
  type NewsListResponse,
  type News,
} from "@/lib/schemas/news.schema";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getNewsList(rawParams: Partial<NewsListParams> = {}): Promise<NewsListResponse> {
  const params = newsListParamsSchema.parse(rawParams);
  const qs = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    categoryId: params.categoryId,
    query: params.query,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sort: params.sort,
  });
  return apiFetch<NewsListResponse>(`/api/v1/articles${qs}`);
}

export async function getNewsDetail(id: string): Promise<News | null> {
  try {
    return await apiFetch<News>(`/api/v1/articles/${id}`);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function getRelatedNews(id: string, limit = 4): Promise<News[]> {
  return apiFetch<News[]>(`/api/v1/articles/${id}/related${buildQuery({ limit })}`);
}

export async function getSameTopicNews(id: string, limit = 4): Promise<News[]> {
  return apiFetch<News[]>(`/api/v1/articles/${id}/same-topic${buildQuery({ limit })}`);
}

export async function getPopularNews(limit = 5): Promise<News[]> {
  return apiFetch<News[]>(`/api/v1/articles/popular${buildQuery({ limit })}`);
}

export async function getAiRecommendedNews(limit = 4): Promise<News[]> {
  return apiFetch<News[]>(`/api/v1/articles/ai-recommended${buildQuery({ limit })}`);
}

export async function getNewsByIds(ids: string[]): Promise<News[]> {
  if (ids.length === 0) return [];
  return apiFetch<News[]>(`/api/v1/articles/by-ids${buildQuery({ ids: ids.join(",") })}`);
}

/** Bumps the public view counter (no login required) and, if logged in, the reader's own read state. */
export async function incrementView(id: string): Promise<void> {
  await apiFetch(`/api/v1/articles/${id}/read`, { method: "POST" });
}

/** Requires login — throws ApiRequestError(401) otherwise, which callers surface as a toast. */
export async function setLike(id: string, liked: boolean): Promise<number> {
  const { likeCount } = await apiFetch<{ likeCount: number }>(`/api/v1/articles/${id}/like`, {
    method: "PUT",
    body: JSON.stringify({ liked }),
  });
  return likeCount;
}

/** Requires login — throws ApiRequestError(401) otherwise, which callers surface as a toast. */
export async function setBookmark(id: string, bookmarked: boolean): Promise<void> {
  await apiFetch(`/api/v1/articles/${id}/bookmark`, {
    method: "PUT",
    body: JSON.stringify({ bookmarked }),
  });
}
