import { findArticleById, updateNormalizedFields } from "@/server/repositories/article.repository";
import { normalizeText } from "@/lib/text";
import { runDedupeJob } from "./dedupe.job";
import type { NormalizeJobData } from "./types";

export async function runNormalizeJob(data: NormalizeJobData): Promise<void> {
  const article = await findArticleById(data.articleId);
  if (!article) return; // 삭제됐거나 이미 처리됨 — 멱등하게 종료

  await updateNormalizedFields(article.id, {
    title: normalizeText(article.title),
    description: article.description ? normalizeText(article.description) : undefined,
  });

  await runDedupeJob({ articleId: article.id });
}
