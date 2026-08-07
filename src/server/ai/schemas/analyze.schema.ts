import { z } from "zod";

// F-02 출력 필드. §13.1: "출력은 JSON 스키마 강제... 코드에서도 검증한다."
export const analyzeOutputSchema = z.object({
  summary_lines: z.array(z.string()).length(3),
  keywords: z.array(z.string()).min(3).max(6),
  importance: z.number().int().min(1).max(5),
  sb_impact_score: z.number().int().min(1).max(5),
  sb_impact_reason: z.string().min(1),
  customer_impact: z.string().optional(),
  digital_impact: z.string().optional(),
  risks: z.array(z.string()).max(3).default([]),
  action_ideas: z.array(z.string()).max(3).default([]),
  ai_comment: z.string().optional(),
  categories: z.array(z.string()).min(1).max(3),
  evidence: z.array(z.string().max(40)).max(2).default([]),
  glossary: z
    .array(z.object({ term: z.string().max(20), definition: z.string().max(120) }))
    .max(8)
    .default([]),
  confidence: z.enum(["high", "medium", "low"]),
});

export type AnalyzeOutput = z.infer<typeof analyzeOutputSchema>;

/**
 * 위 zod 스키마와 같은 내용을 순수 JSON으로 표현한 것 — LLM에게 프롬프트로 보여주는 용도다
 * (zod 스키마 객체 자체는 직렬화하면 순환 참조가 있는 내부 구조가 나오므로 쓸 수 없다).
 * 두 정의가 벌어지지 않도록 이 파일 하나에서만 관리하고, 시드 스크립트도 여기서 import한다.
 */
export const analyzeOutputJsonSchema = {
  type: "object",
  required: [
    "summary_lines",
    "keywords",
    "importance",
    "sb_impact_score",
    "sb_impact_reason",
    "categories",
    "confidence",
  ],
  properties: {
    summary_lines: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    keywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    importance: { type: "integer", minimum: 1, maximum: 5 },
    sb_impact_score: { type: "integer", minimum: 1, maximum: 5 },
    sb_impact_reason: { type: "string" },
    customer_impact: { type: "string" },
    digital_impact: { type: "string" },
    risks: { type: "array", items: { type: "string" }, maxItems: 3 },
    action_ideas: { type: "array", items: { type: "string" }, maxItems: 3 },
    ai_comment: { type: "string" },
    categories: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    evidence: { type: "array", items: { type: "string" }, maxItems: 2 },
    glossary: {
      type: "array",
      items: {
        type: "object",
        required: ["term", "definition"],
        properties: { term: { type: "string" }, definition: { type: "string" } },
      },
      maxItems: 8,
    },
    confidence: { enum: ["high", "medium", "low"] },
  },
} as const;
