import { z } from "zod";
import { CATEGORIES } from "@/data/categories";
import { glossaryTermSchema } from "@/lib/schemas/news.schema";

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

/**
 * Claude's structured output for one article. glossary는 RSS 자동수집 분석
 * (server/ai/schemas/analyze.schema.ts)과 같은 {term, definition} 모양을
 * 그대로 재사용한다 — 입력 경로가 달라도 저장/화면 표시 레이어가 동일하게
 * 동작하도록 하기 위함이다 (§금융·경제 용어 기능 통합).
 */
export const ingestAnalyzeOutputSchema = z.object({
  title: z.string().min(5),
  summaryBullets: z.array(z.string().min(1)).length(3),
  categoryId: z.enum(CATEGORY_IDS),
  keywords: z.array(z.string().min(1)).min(3).max(6),
  tags: z.array(z.string().min(1)).min(2).max(4),
  glossary: z.array(glossaryTermSchema).max(5).default([]),
  /** 전체 금융권 관점 중요도(1-5) — RSS 자동수집 분석과 같은 기준. 이전에는 이
   *  경로에서 AI에게 물어보지도 않고 3으로 고정했었다. */
  importance: z.number().int().min(1).max(5).default(3),
  /** 저축은행 업계 관점 영향도(1-5) — RSS 자동수집 분석과 같은 기준. 이전에는
   *  이 경로에서 AI에게 물어보지도 않고 3으로 고정했었다. */
  sbImpactScore: z.number().int().min(1).max(5).default(3),
  sbImpactReason: z.string().min(1).default("관리자 수동 등록 — 세부 영향도 분석은 실행되지 않았습니다."),
});
export type IngestAnalyzeOutput = z.infer<typeof ingestAnalyzeOutputSchema>;

/** Full response: Claude's output plus the extracted source material. */
export const ingestAnalyzeResponseSchema = z.object({
  analysis: ingestAnalyzeOutputSchema,
  body: z.string(),
  sourceUrl: z.string().nullable(),
  extractedTitle: z.string().nullable(),
  extractedImageUrl: z.string().nullable(),
  modelKey: z.string(),
  tokenInput: z.number(),
  tokenOutput: z.number(),
  latencyMs: z.number(),
});
export type IngestAnalyzeResponse = z.infer<typeof ingestAnalyzeResponseSchema>;
