import { findArticleById, updateNormalizedFields } from "@/server/repositories/article.repository";
import { normalizeText } from "@/lib/text";
import { dedupeQueue } from "./queues";
import type { NormalizeJobData } from "./queues";

export async function runNormalizeJob(data: NormalizeJobData): Promise<void> {
  const article = await findArticleById(data.articleId);
  if (!article) return; // 삭제됐거나 이미 처리됨 — 멱등하게 종료

  await updateNormalizedFields(article.id, {
    title: normalizeText(article.title),
    description: article.description ? normalizeText(article.description) : undefined,
  });

  await dedupeQueue.add("dedupe", { articleId: article.id });
}
