import { z } from "zod";

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const newsStatusSchema = z.enum(["published", "scheduled", "draft"]);
export type NewsStatus = z.infer<typeof newsStatusSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  colorVar: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const publisherSchema = z.object({
  publisher: z.string(),
  count: z.number().int().nonnegative(),
});
export type PublisherCount = z.infer<typeof publisherSchema>;
export const publisherListSchema = z.array(publisherSchema);

export const glossaryTermSchema = z.object({
  term: z.string(),
  definition: z.string(),
  /** 이 기사에서 용어가 쓰인 맥락 한 문장. AI가 채우는 선택 필드 — 없어도 term/definition만으로 동작한다. */
  context: z.string().optional(),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

export const newsSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  thumbnailGradient: z.tuple([z.string(), z.string()]),
  imageUrl: z.string().nullable().default(null),
  publisher: z.string(),
  reporter: z.string(),
  publishedAt: z.string(),
  viewCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  categoryId: z.string(),
  tags: z.array(z.string()),
  summaryBullets: z.array(z.string()).min(3).max(3),
  body: z.string(),
  keywords: z.array(z.string()),
  aiImportance: z.number().int().min(1).max(5),
  financialImpact: z.number().int().min(1).max(5),
  savingsBankImpact: z.number().int().min(1).max(5),
  aiConfidence: confidenceSchema,
  glossary: z.array(glossaryTermSchema).default([]),
  isAiRecommended: z.boolean().default(false),
  status: newsStatusSchema.default("published"),
  scheduledAt: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
});
export type News = z.infer<typeof newsSchema>;

export const newsListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(9),
  categoryId: z.string().optional(),
  query: z.string().optional(),
  publisher: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["latest", "views", "impact"]).default("latest"),
});
export type NewsListParams = z.infer<typeof newsListParamsSchema>;

export const newsListResponseSchema = z.object({
  items: z.array(newsSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasMore: z.boolean(),
});
export type NewsListResponse = z.infer<typeof newsListResponseSchema>;

export const newsEditFormSchema = z.object({
  title: z.string().min(5, { message: "제목은 5자 이상 입력해주세요." }),
  categoryId: z.string().min(1, { message: "카테고리를 선택해주세요." }),
  status: newsStatusSchema,
  summaryLine1: z.string().min(1, { message: "요약을 입력해주세요." }),
  summaryLine2: z.string().min(1, { message: "요약을 입력해주세요." }),
  summaryLine3: z.string().min(1, { message: "요약을 입력해주세요." }),
  keywords: z.string().min(1, { message: "키워드를 1개 이상 입력해주세요." }),
  body: z.string().min(30, { message: "본문은 30자 이상 입력해주세요." }),
  imageUrl: z.union([z.string().url({ message: "올바른 이미지 URL이 아닙니다." }), z.literal("")]),
  glossary: z
    .array(
      z.object({
        term: z.string().min(1, { message: "용어를 입력해주세요." }),
        definition: z.string().min(1, { message: "설명을 입력해주세요." }),
        context: z.string().optional(),
      })
    )
    .max(10, { message: "용어는 최대 10개까지 입력할 수 있습니다." }),
});
export type NewsEditFormInput = z.infer<typeof newsEditFormSchema>;
