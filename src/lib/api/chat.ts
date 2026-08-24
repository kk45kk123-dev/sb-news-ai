import { apiFetch } from "@/lib/api/http";
import {
  askQuestionResponseSchema,
  chatSessionListSchema,
  chatSessionDetailSchema,
  type AskQuestionInput,
  type AskQuestionResponse,
  type ChatSessionDto,
  type ChatSessionDetail,
} from "@/lib/schemas/chat.schema";

export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionResponse> {
  const data = await apiFetch<unknown>("/api/v1/chat", { method: "POST", body: JSON.stringify(input) });
  return askQuestionResponseSchema.parse(data);
}

export async function getChatSessions(): Promise<ChatSessionDto[]> {
  const data = await apiFetch<unknown>("/api/v1/chat/sessions");
  return chatSessionListSchema.parse(data);
}

export async function getChatSessionDetail(id: string): Promise<ChatSessionDetail> {
  const data = await apiFetch<unknown>(`/api/v1/chat/sessions/${id}`);
  return chatSessionDetailSchema.parse(data);
}
