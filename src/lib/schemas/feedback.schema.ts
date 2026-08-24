import { z } from "zod";

// good/inaccurate만 UI에 노출한다(👍/👎) — irrelevant는 스키마상 남겨두지만(향후 확장),
// 이번 축소판 범위 밖이다.
export const feedbackTypeSchema = z.enum(["good", "inaccurate", "irrelevant"]);
export type FeedbackTypeValue = z.infer<typeof feedbackTypeSchema>;

export const submitFeedbackSchema = z.object({
  type: feedbackTypeSchema,
  comment: z.string().max(500, { message: "500자 이내로 입력해주세요." }).optional(),
});
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

export const myFeedbackSchema = z.object({ type: feedbackTypeSchema.nullable() });
export type MyFeedback = z.infer<typeof myFeedbackSchema>;

export const feedbackStatusSchema = z.enum(["open", "reviewed", "resolved"]);
export type FeedbackStatusValue = z.infer<typeof feedbackStatusSchema>;

export const adminFeedbackItemSchema = z.object({
  id: z.string(),
  type: feedbackTypeSchema,
  comment: z.string().nullable(),
  status: feedbackStatusSchema,
  createdAt: z.string(),
  userName: z.string(),
  articleId: z.string(),
  articleTitle: z.string(),
});
export type AdminFeedbackItem = z.infer<typeof adminFeedbackItemSchema>;

export const adminFeedbackListSchema = z.array(adminFeedbackItemSchema);
