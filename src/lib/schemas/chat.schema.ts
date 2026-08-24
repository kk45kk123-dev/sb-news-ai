import { z } from "zod";

export const askQuestionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  question: z.string().min(2, { message: "질문을 2자 이상 입력해주세요." }).max(500, { message: "질문은 500자 이내로 입력해주세요." }),
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const citationSchema = z.object({
  index: z.number(),
  articleId: z.string(),
  title: z.string(),
  publisher: z.string().nullable(),
  publishedAt: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const askQuestionResponseSchema = z.object({
  sessionId: z.string(),
  answer: z.string(),
  citations: z.array(citationSchema),
});
export type AskQuestionResponse = z.infer<typeof askQuestionResponseSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  referencedArticleIds: z.array(z.string()),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof chatMessageSchema>;

export const chatSessionSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ChatSessionDto = z.infer<typeof chatSessionSchema>;

export const chatSessionListSchema = z.array(chatSessionSchema);

export const chatSessionDetailSchema = z.object({
  session: chatSessionSchema,
  messages: z.array(chatMessageSchema),
});
export type ChatSessionDetail = z.infer<typeof chatSessionDetailSchema>;
