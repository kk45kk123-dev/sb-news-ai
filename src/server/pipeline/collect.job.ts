import { getCollector } from "@/server/collectors/registry";
import { findSourceById, updateSourceStatus } from "@/server/repositories/source.repository";
import { createArticleIfNew } from "@/server/repositories/article.repository";
import { recordCrawlLog } from "@/server/repositories/crawl-log.repository";
import { runNormalizeJob } from "./normalize.job";
import { SOURCE_MAX_CONSECUTIVE_FAILURES } from "./constants";
import type { CollectJobData } from "./types";

/**
 * 출처 하나를 수집한다. 이 함수 내부에서 발생한 에러는 이 출처의 실패로만 처리되고
 * (crawl_logs 기록 + consecutive_failures 증가) 다른 출처의 수집을 막지 않는다 —
 * 호출부(run-daily-pipeline.ts)가 출처마다 이 함수를 개별 try/catch로 호출하기
 * 때문이다 (§5.2 "출처별 격리"). 예전에는 BullMQ가 재시도(지수 백오프 최대 3회)를
 * 대신해줬지만, 지금은 하루 1회 크론이 사실상 그 역할을 한다 — 오늘 실패해도
 * 내일 다시 시도된다.
 *
 * 수집한 기사 하나하나의 이후 단계(정규화→중복검사→분석)는 각각 별도로 try/catch해
 * 그중 하나가 실패해도(예: 그 기사만 AI 분석 오류) 이 출처의 crawl_log는 정상 success로
 * 남는다 — RSS 수집 자체는 성공했기 때문이다.
 */
export interface CollectJobResult {
  itemsFound: number;
  itemsNew: number;
}

export async function runCollectJob(data: CollectJobData): Promise<CollectJobResult> {
  const startedAt = new Date();
  const source = await findSourceById(data.sourceId);
  if (!source || !source.isActive) return { itemsFound: 0, itemsNew: 0 };

  try {
    const collector = getCollector(source.type);
    const items = await collector.collect({
      id: source.id,
      name: source.name,
      url: source.url,
      config: source.config as Record<string, unknown>,
    });

    let newCount = 0;
    for (const item of items) {
      const article = await createArticleIfNew(source.orgId, source.id, item);
      if (article) {
        newCount += 1;
        try {
          await runNormalizeJob({ articleId: article.id });
        } catch (e) {
          console.error(`[collect] downstream pipeline failed for article ${article.id}`, e);
        }
      }
    }

    await recordCrawlLog({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date(),
      status: "success",
      itemsFound: items.length,
      itemsNew: newCount,
    });
    await updateSourceStatus(source.id, "ok", 0);
    return { itemsFound: items.length, itemsNew: newCount };
  } catch (e) {
    const failures = source.consecutiveFailures + 1;
    await recordCrawlLog({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date(),
      status: "error",
      itemsFound: 0,
      itemsNew: 0,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    await updateSourceStatus(
      source.id,
      failures >= SOURCE_MAX_CONSECUTIVE_FAILURES ? "error" : source.status,
      failures
    );
    throw e; // 호출부(run-daily-pipeline.ts)가 출처별로 격리해서 처리하도록 다시 던진다
  }
}
