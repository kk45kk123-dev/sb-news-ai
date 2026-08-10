import { applyCategoryNameOverrides } from "@/data/categories";
import { apiFetch } from "@/lib/api/http";
import { dashboardStatsSchema, pipelineStepSchema, type DashboardStats, type PipelineStep } from "@/lib/schemas/admin.schema";
import { newsListParamsSchema, type NewsListParams, type NewsListResponse, type News } from "@/lib/schemas/news.schema";
import { orgSettingsSchema, type OrgSettings, type OrgSettingsPatch } from "@/lib/schemas/settings.schema";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Admin news list includes every status (draft/scheduled/published), unlike the public feed. */
export async function getAdminNewsList(rawParams: Partial<NewsListParams> = {}): Promise<NewsListResponse> {
  const params = newsListParamsSchema.parse(rawParams);
  const qs = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    categoryId: params.categoryId,
    query: params.query,
    sort: params.sort,
    includeAllStatuses: true,
  });
  return apiFetch<NewsListResponse>(`/api/v1/articles${qs}`);
}

export interface UpdateNewsPatch {
  title?: string;
  categoryId?: string;
  status?: News["status"];
  scheduledAt?: string | null;
  summaryBullets?: [string, string, string];
  keywords?: string[];
  body?: string;
}

export async function updateNews(id: string, patch: UpdateNewsPatch): Promise<News | null> {
  return apiFetch<News>(`/api/v1/admin/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteNews(id: string): Promise<boolean> {
  await apiFetch(`/api/v1/admin/articles/${id}`, { method: "DELETE" });
  return true;
}

/**
 * Computed client-side from a real (large-page) news fetch, same aggregation
 * logic the old mock used — just swapping the data source. At this project's
 * expected volume (§17.1: 일 50~100건) this is cheap; a dedicated aggregation
 * endpoint would be the next step if that stops being true.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ items: published }, settings] = await Promise.all([
    getAdminNewsList({ pageSize: 100, sort: "latest" }),
    getSettings(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = published.filter((n) => n.publishedAt.startsWith(today)).length;
  const totalViews = published.reduce((sum, n) => sum + n.viewCount, 0);
  const highConfidence = published.filter((n) => n.aiConfidence === "high").length;

  const categoryCounts = applyCategoryNameOverrides(settings.categoryNames).map((c) => ({
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
      views: dayArticles.reduce((s, n) => s + n.viewCount, 0),
    };
  });

  return dashboardStatsSchema.parse({
    todayNewsCount: todayCount,
    todayNewsDelta: 0,
    totalViews,
    totalViewsDelta: 0,
    aiAnalysisRate: Math.round((highConfidence / Math.max(published.length, 1)) * 100),
    scrapSuccessRate: 100,
    categoryCounts,
    weeklyTrend,
    recentLogins: [],
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

// ---- 운영 설정 ------------------------------------------------------------

export async function getSettings(): Promise<OrgSettings> {
  const data = await apiFetch<unknown>("/api/v1/admin/settings");
  return orgSettingsSchema.parse(data);
}

export async function updateSettings(patch: OrgSettingsPatch): Promise<OrgSettings> {
  const data = await apiFetch<unknown>("/api/v1/admin/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return orgSettingsSchema.parse(data);
}
