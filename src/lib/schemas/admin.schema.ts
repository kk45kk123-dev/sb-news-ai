import { z } from "zod";

export const pipelineStepStatusSchema = z.enum(["pending", "running", "done", "error"]);
export type PipelineStepStatus = z.infer<typeof pipelineStepStatusSchema>;

export const pipelineStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: pipelineStepStatusSchema,
  detail: z.string().optional(),
});
export type PipelineStep = z.infer<typeof pipelineStepSchema>;

export const ingestInputSchema = z
  .object({
    mode: z.enum(["url", "text"]),
    url: z.string().optional(),
    text: z.string().optional(),
  })
  .refine((data) => (data.mode === "url" ? !!data.url && /^https?:\/\/.+/.test(data.url) : !!data.text && data.text.length >= 30), {
    message: "URL 모드에서는 올바른 URL을, 원문 모드에서는 30자 이상의 본문을 입력해주세요.",
    path: ["url"],
  });
export type IngestInput = z.infer<typeof ingestInputSchema>;

export const dashboardStatsSchema = z.object({
  todayNewsCount: z.number().int(),
  todayNewsDelta: z.number(),
  totalViews: z.number().int(),
  totalViewsDelta: z.number(),
  aiAnalysisRate: z.number(),
  scrapSuccessRate: z.number(),
  categoryCounts: z.array(z.object({ categoryId: z.string(), name: z.string(), count: z.number() })),
  weeklyTrend: z.array(z.object({ date: z.string(), articles: z.number(), views: z.number() })),
  recentLogins: z.array(
    z.object({ id: z.string(), name: z.string(), role: z.string(), at: z.string() })
  ),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int(),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;
