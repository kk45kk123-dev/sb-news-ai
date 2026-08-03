import { prisma } from "@/server/db/client";
import { findArticleById, setPipelineStage } from "@/server/repositories/article.repository";
import { analyzeQueue } from "./queues";
import type { DedupeJobData } from "./queues";

const RECENT_WINDOW_HOURS = 24;

/**
 * Phase 1의 DEDUPE는 가벼운 수준이다: url_hash 유니크 제약(F-01)이 URL 단위 중복은
 * 이미 막았으므로, 여기서는 같은 제목이 24시간 내 다른 기사로 이미 들어와 있는지만
 * 확인한다. 임베딩/유사도 기반 클러스터링(F-11, 파이프라인 [5] CLUSTER)은 Phase 2다.
 */
export async function runDedupeJob(data: DedupeJobData): Promise<void> {
  const article = await findArticleById(data.articleId);
  if (!article) return;

  const since = new Date(Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000);
  const duplicate = await prisma.article.findFirst({
    where: {
      id: { not: article.id },
      title: article.title,
      collectedAt: { gte: since },
    },
  });

  if (duplicate) {
    // 완전 동일 제목의 최근 기사가 이미 있음 — 별도 클러스터 로직 없이 여기서 종료.
    // 삭제하지 않고 남겨둔다(원본 URL 접근성 보존, §20-1) — 목록 화면에서는
    // is_cluster_lead 기반 접기가 Phase 2에 들어가기 전까지 중복 노출될 수 있다.
    return;
  }

  await setPipelineStage(article.id, "normalized");
  await analyzeQueue.add("analyze", { articleId: article.id });
}
