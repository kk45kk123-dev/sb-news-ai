import { DEFAULT_ORG_ID } from "@/config/constants";
import { listDueSources } from "@/server/repositories/source.repository";
import { findArticlesByPipelineStages } from "@/server/repositories/article.repository";
import { runCollectJob } from "./collect.job";
import { runNormalizeJob } from "./normalize.job";
import { runPurgeJob } from "./purge.job";
import { runBriefingJob } from "./briefing.job";

// Vercel Cron 라우트의 maxDuration(60s, route.ts 참고)보다 여유를 둔 안전 한도.
// 이 시간을 넘기면 새 작업을 시작하지 않고 정리 단계로 넘어간다 — 처리하지 못한
// 항목은 collected/normalized 단계 그대로 남아 다음 날 실행이 이어서 처리한다.
const TIME_BUDGET_MS = 50_000;
// 하루치 실행이 미완료 기사를 무한정 끌어안지 않도록 한 번에 재개할 상한.
const STUCK_ARTICLE_LIMIT = 50;

export interface DailyPipelineResult {
  resumedStuck: number;
  sourcesProcessed: number;
  sourcesFailed: number;
  sourcesSkipped: number;
  purgedCount: number;
  briefingGenerated: boolean;
  timedOut: boolean;
  durationMs: number;
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

/**
 * 무료 티어(Vercel Hobby 크론 하루 1회 제한, 서버리스 함수 실행시간 제한, 한정된
 * AI 예산)에 맞춰 설계한 배치 파이프라인. 예전의 BullMQ 상시 워커(1분마다 폴링)를
 * 대체한다 — 하루 한 번, 이 함수 하나가 수집→정규화→중복검사→분석→원문정리→
 * 브리핑생성까지 순서대로 처리하고 끝난다.
 *
 * 시간 제한으로 도중에 멈추더라도 데이터가 유실되거나 영구히 멈춰있지 않도록,
 * 매 실행은 먼저 "전날 다 못 끝낸 기사"부터 이어서 처리한 뒤 새 수집을 시작한다.
 */
export async function runDailyPipeline(): Promise<DailyPipelineResult> {
  const startedAt = Date.now();
  const result: DailyPipelineResult = {
    resumedStuck: 0,
    sourcesProcessed: 0,
    sourcesFailed: 0,
    sourcesSkipped: 0,
    purgedCount: 0,
    briefingGenerated: false,
    timedOut: false,
    durationMs: 0,
  };

  // 1) 이전 실행이 시간 제한으로 끊겨 미완료 상태(collected/normalized)로 남은
  //    기사를 이어서 처리한다. "failed"는 여기서 다시 시도하지 않는다 — AI 호출이
  //    이미 실패로 끝난 건이라 매일 재시도하면 예산만 소모될 수 있어, 필요하면
  //    관리자가 뉴스 관리 화면에서 수동으로 재처리하는 걸 기본으로 한다.
  const stuck = await findArticlesByPipelineStages(DEFAULT_ORG_ID, ["collected", "normalized"], STUCK_ARTICLE_LIMIT);
  for (const article of stuck) {
    if (elapsedMs(startedAt) > TIME_BUDGET_MS) {
      result.timedOut = true;
      break;
    }
    try {
      await runNormalizeJob({ articleId: article.id });
      result.resumedStuck += 1;
    } catch (e) {
      console.error(`[daily-pipeline] resume failed for article ${article.id}`, e);
    }
  }

  // 2) 신규 수집 — 출처마다 시간 예산을 다시 확인한다.
  if (!result.timedOut) {
    const due = await listDueSources(new Date());
    for (let i = 0; i < due.length; i++) {
      if (elapsedMs(startedAt) > TIME_BUDGET_MS) {
        result.timedOut = true;
        result.sourcesSkipped = due.length - i;
        break;
      }
      try {
        await runCollectJob({ sourceId: due[i]!.id });
        result.sourcesProcessed += 1;
      } catch (e) {
        result.sourcesFailed += 1;
        console.error(`[daily-pipeline] source ${due[i]!.id} failed`, e);
      }
    }
  }

  // 3) 원문 정리 — 가볍고 AI 비용이 없으므로 시간 예산과 무관하게 항상 실행해
  //    Neon 무료 저장용량을 보호한다.
  try {
    const purgeResult = await runPurgeJob();
    result.purgedCount = purgeResult.purgedCount;
  } catch (e) {
    console.error("[daily-pipeline] purge failed", e);
  }

  // 4) 오늘의 브리핑 자동 생성 — AI 호출 1건 (후보 기사가 없으면 조용히 건너뛴다).
  try {
    result.briefingGenerated = await runBriefingJob();
  } catch (e) {
    console.error("[daily-pipeline] briefing generation failed", e);
  }

  result.durationMs = elapsedMs(startedAt);
  return result;
}
