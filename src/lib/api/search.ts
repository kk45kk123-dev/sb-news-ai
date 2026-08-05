import { getNewsList } from "@/lib/api/news";
import type { NewsListParams, NewsListResponse } from "@/lib/schemas/news.schema";

export const POPULAR_SEARCHES = ["기준금리", "PF대출", "예금자보호한도", "DSR 규제", "BIS비율", "저축은행 M&A"];

export async function searchNews(params: Partial<NewsListParams>): Promise<NewsListResponse> {
  return getNewsList({ ...params, sort: params.sort ?? "latest" });
}

export async function getAutocompleteSuggestions(query: string, limit = 6): Promise<string[]> {
  if (!query.trim()) return [];
  const { items } = await getNewsList({ query, pageSize: 20, sort: "latest" });

  const q = query.toLowerCase();
  const pool = new Set<string>();
  for (const item of items) {
    if (item.title.toLowerCase().includes(q)) pool.add(item.title);
    for (const kw of item.keywords) {
      if (kw.toLowerCase().includes(q)) pool.add(kw);
    }
    if (pool.size >= limit * 2) break;
  }
  return Array.from(pool).slice(0, limit);
}
