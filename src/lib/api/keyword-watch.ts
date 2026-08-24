import { apiFetch } from "@/lib/api/http";
import {
  keywordWatchListSchema,
  keywordWatchSchema,
  type CreateWatchInput,
  type KeywordWatchItem,
} from "@/lib/schemas/keyword-watch.schema";

export async function getMyWatches(): Promise<KeywordWatchItem[]> {
  const data = await apiFetch<unknown>("/api/v1/keyword-watches");
  return keywordWatchListSchema.parse(data);
}

export async function createWatch(input: CreateWatchInput): Promise<KeywordWatchItem> {
  const data = await apiFetch<unknown>("/api/v1/keyword-watches", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return keywordWatchSchema.parse(data);
}

export async function deleteWatch(id: string): Promise<void> {
  await apiFetch(`/api/v1/keyword-watches/${id}`, { method: "DELETE" });
}
