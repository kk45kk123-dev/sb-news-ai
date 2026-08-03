import { getCollector } from "@/server/collectors/registry";
import { findSourceById, updateSourceStatus } from "@/server/repositories/source.repository";
import { createArticleIfNew } from "@/server/repositories/article.repository";
import { recordCrawlLog } from "@/server/repositories/crawl-log.repository";
import { normalizeQueue } from "./queues";
import { SOURCE_MAX_CONSECUTIVE_FAILURES } from "./constants";
import type { CollectJobData } from "./queues";

/**
 * 출처 하나를 수집한다. 이 함수 내부에서 발생한 에러는 이 출처의 실패로만 처리되고
 * (crawl_logs 기록 + consecutive_failures 증가) 다른 출처의 수집을 막지 않는다 —
 * 호출부(워커)가 출처별로 독립된 잡으로 이 함수를 실행하기 때문이다 (§5.2 "출처별 격리").
 */
export async function runCollectJob(data: CollectJobData): Promise<void> {
  const startedAt = new Date();
  const source = await findSourceById(data.sourceId);
  if (!source || !source.isActive) return;

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
        await normalizeQueue.add("normalize", { articleId: article.id });
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
    throw e; // BullMQ가 재시도 정책(지수 백오프 최대 3회)을 적용하도록 다시 던진다
  }
}
