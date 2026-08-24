import { apiFetch } from "@/lib/api/http";
import { myFeedbackSchema, type SubmitFeedbackInput, type MyFeedback } from "@/lib/schemas/feedback.schema";

export async function getMyFeedback(articleId: string): Promise<MyFeedback> {
  const data = await apiFetch<unknown>(`/api/v1/articles/${articleId}/feedback`);
  return myFeedbackSchema.parse(data);
}

export async function submitFeedback(articleId: string, input: SubmitFeedbackInput): Promise<MyFeedback> {
  const data = await apiFetch<unknown>(`/api/v1/articles/${articleId}/feedback`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return myFeedbackSchema.parse(data);
}
