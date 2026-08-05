import { z } from "zod";
import { CATEGORIES } from "@/data/categories";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

/** What the client sends to POST /api/admin/ingest/analyze. */
export const ingestAnalyzeRequestSchema = z
  .object({
    mode: z.enum(["url", "text"]),
    url: z.string().optional(),
    text: z.string().optional(),
  })
  .refine(
    (data) =>
      data.mode === "url"
        ? !!data.url && /^https?:\/\/.+/.test(data.url)
        : !!data.text && data.text.trim().length >= 30,
    {
      message: "URL 모드에서는 올바른 URL을, 원문 모드에서는 30자 이상의 본문을 입력해주세요.",
      path: ["url"],
    }
  );
export type IngestAnalyzeRequest = z.infer<typeof ingestAnalyzeRequestSchema>;

/** Claude's structured output for one article. */
export const ingestAnalyzeOutputSchema = z.object({
  title: z.string().min(5),
  summaryBullets: z.array(z.string().min(1)).length(3),
  categoryId: z.enum(CATEGORY_IDS),
  keywords: z.array(z.string().min(1)).min(3).max(6),
  tags: z.array(z.string().min(1)).min(2).max(4),
});
export type IngestAnalyzeOutput = z.infer<typeof ingestAnalyzeOutputSchema>;

/** Full response: Claude's output plus the extracted source material. */
export const ingestAnalyzeResponseSchema = z.object({
  analysis: ingestAnalyzeOutputSchema,
  body: z.string(),
  sourceUrl: z.string().nullable(),
  extractedTitle: z.string().nullable(),
  modelKey: z.string(),
  tokenInput: z.number(),
  tokenOutput: z.number(),
  latencyMs: z.number(),
});
export type IngestAnalyzeResponse = z.infer<typeof ingestAnalyzeResponseSchema>;
