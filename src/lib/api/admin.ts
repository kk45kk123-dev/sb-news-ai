import { CATEGORIES } from "@/data/categories";
import * as store from "@/lib/api/news-store";
import { networkDelay } from "@/lib/api/shared";
import { dashboardStatsSchema, pipelineStepSchema, type DashboardStats, type PipelineStep } from "@/lib/schemas/admin.schema";
import { newsListParamsSchema, newsListResponseSchema, newsSchema, type NewsListParams, type NewsListResponse, type News } from "@/lib/schemas/news.schema";

function applySort(items: News[], sort: NewsListParams["sort"]): News[] {
  const copy = [...items];
  if (sort === "views") return copy.sort((a, b) => b.viewCount - a.viewCount);
  if (sort === "impact") return copy.sort((a, b) => b.aiImportance - a.aiImportance);
  return copy.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/** Admin news list includes every status (draft/scheduled/published), unlike the public feed. */
export async function getAdminNewsList(rawParams: Partial<NewsListParams> = {}): Promise<NewsListResponse> {
  const params = newsListParamsSchema.parse(rawParams);
  await networkDelay(300);

  let items = store.listAll();
  if (params.categoryId) items = items.filter((n) => n.categoryId === params.categoryId);
  if (params.query) {
    const q = params.query.toLowerCase();
    items = items.filter((n) => n.title.toLowerCase().includes(q));
  }
  items = applySort(items, params.sort);

  const start = (params.page - 1) * params.pageSize;
  const pageItems = items.slice(start, start + params.pageSize);
  return newsListResponseSchema.parse({
    items: pageItems,
    total: items.length,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: start + pageItems.length < items.length,
  });
}

export async function updateNews(id: string, patch: Partial<News>): Promise<News | null> {
  await networkDelay(300);
  const updated = store.update(id, patch);
  return updated ? newsSchema.parse(updated) : null;
}

export async function deleteNews(id: string): Promise<boolean> {
  await networkDelay(300);
  return store.remove(id);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await networkDelay(400);
  const all = store.listAll();
  const published = all.filter((n) => n.status === "published");
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = published.filter((n) => n.publishedAt.startsWith(today)).length;
  const totalViews = published.reduce((sum, n) => sum + n.viewCount, 0);
  const highConfidence = published.filter((n) => n.aiConfidence === "high").length;

  const categoryCounts = CATEGORIES.map((c) => ({
    categoryId: c.id,
    name: c.name,
    count: published.filter((n) => n.categoryId === c.id).length,
  }));

  const weeklyTrend = Array.from({ length: 7 }).map((_, i) => {
    const dayIdx = 6 - i;
    const date = new Date();
    date.setDate(date.getDate() - dayIdx);
    const dateStr = date.toISOString().slice(0, 10);
    const dayArticles = published.filter((n) => n.publishedAt.startsWith(dateStr));
    return {
      date: dateStr,
      articles: dayArticles.length,
      views: dayArticles.reduce((s, n) => s + n.viewCount, 0) || Math.round(totalViews / 14),
    };
  });

  return dashboardStatsSchema.parse({
    todayNewsCount: todayCount,
    todayNewsDelta: 12.5,
    totalViews,
    totalViewsDelta: 8.2,
    aiAnalysisRate: Math.round((highConfidence / Math.max(published.length, 1)) * 100),
    scrapSuccessRate: 96,
    categoryCounts,
    weeklyTrend,
    recentLogins: [
      { id: "a1", name: "김관리", role: "admin", at: "2026-08-04T08:52:00+09:00" },
      { id: "a2", name: "박편집", role: "editor", at: "2026-08-04T08:10:00+09:00" },
      { id: "a3", name: "이열람", role: "viewer", at: "2026-08-03T19:41:00+09:00" },
    ],
  });
}

// ---- URL/text ingest pipeline -------------------------------------------------

export const PIPELINE_STEP_DEFS: { id: string; label: string }[] = [
  { id: "extract", label: "본문 추출 + AI 분석" },
  { id: "review", label: "게시 준비" },
];

export function createInitialPipelineSteps(): PipelineStep[] {
  return PIPELINE_STEP_DEFS.map((s) => pipelineStepSchema.parse({ id: s.id, label: s.label, status: "pending" }));
}

export async function commitIngestedArticle(article: Omit<News, "id" | "slug">): Promise<News> {
  await networkDelay(300);
  const id = `ing-${Date.now()}`;
  const news = newsSchema.parse({
    ...article,
    id,
    slug: id,
  });
  return store.insert(news);
}
