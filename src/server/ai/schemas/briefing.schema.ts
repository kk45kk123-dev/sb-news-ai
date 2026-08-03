import { z } from "zod";

// F-03 출력 필드. schemas/analyze.schema.ts와 같은 원칙 — zod가 검증기, JSON 스키마는
// 프롬프트에 보여주는 용도로 동일 파일에서 함께 관리한다.
export const briefingOutputSchema = z.object({
  overview: z.string().min(1),
  items: z
    .array(
      z.object({
        article_id: z.string().min(1),
        why_now: z.string().min(1),
        so_what: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
  follow_ups: z.array(z.string()).max(3).default([]),
});

export type BriefingOutput = z.infer<typeof briefingOutputSchema>;

export const briefingOutputJsonSchema = {
  type: "object",
  required: ["overview", "items", "follow_ups"],
  properties: {
    overview: { type: "string" },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        required: ["article_id", "why_now", "so_what"],
        properties: {
          article_id: { type: "string" },
          why_now: { type: "string" },
          so_what: { type: "string" },
        },
      },
    },
    follow_ups: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
} as const;
