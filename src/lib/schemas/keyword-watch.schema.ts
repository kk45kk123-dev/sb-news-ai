import { z } from "zod";

export const createWatchSchema = z.object({
  keyword: z
    .string()
    .min(2, { message: "키워드는 2자 이상 입력해주세요." })
    .max(100, { message: "키워드는 100자 이내로 입력해주세요." }),
  minImpact: z.number().int().min(1).max(5).nullable().optional(),
});
export type CreateWatchInput = z.infer<typeof createWatchSchema>;

export const keywordWatchSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  minImpact: z.number().nullable(),
  isActive: z.boolean(),
});
export type KeywordWatchItem = z.infer<typeof keywordWatchSchema>;

export const keywordWatchListSchema = z.array(keywordWatchSchema);
