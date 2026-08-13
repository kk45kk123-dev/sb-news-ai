import { DEFAULT_ORG_ID } from "@/config/constants";
import { listDueSources } from "@/server/repositories/source.repository";
import { findArticlesByPipelineStages } from "@/server/repositories/article.repository";
import { isAiBudgetExceeded } from "@/server/ai/budget";
import { redis } from "@/server/redis/client";
import { findAdminUserIds } from "@/server/repositories/user.repository";
import { createNotificationForUsers } from "@/server/repositories/notification.repository";
import { getOrgSettings } from "@/server/services/settings.service";
import { runCollectJob } from "./collect.job";
import { runNormalizeJob } from "./normalize.job";
import { runPurgeJob } from "./purge.job";
import { runBriefingJob } from "./briefing.job";

/** 설정 화면의 "이메일 알림"(주요 이벤트) 토글 — 지금은 실제 이메일 대신 관리자
 *  인앱 알림함으로 전달한다. 알림 생성 실패가 파이프라인을 막으면 안 되므로 삼킨다. */
async function notifyMajorEvent(orgId: string, title: string, body: string): Promise<void> {
  try {
    const settings = await getOrgSettings(orgId);
    if (!settings.emailAlerts) return;
    const adminIds = await findAdminUserIds(orgId);
    await createNotificationForUsers(adminIds, { type: "pipeline_event", title, body, link: "/admin" });
  } catch (e) {
    console.error("[daily-pipeline] major-event notification failed", e);
  }
}

// Vercel Cron 라우트의 maxDuration(60s, route.ts 참고)보다 여유를 둔 안전 한도.
// 이 시간을 넘기면 새 작업을 시작하지 않고 정리 단계로 넘어간다 — 처리하지 못한
// 항목은 collected/normalized 단계 그대로 남아 다음 날 실행이 이어서 처리한다.
const TIME_BUDGET_MS = 50_000;
// 하루치 실행이 미완료 기사를 무한정 끌어안지 않도록 한 번에 재개할 상한.
const STUCK_ARTICLE_LIMIT = 50;

// 동시 실행 방지 락. Vercel 크론이 중복 호출되거나(플랫폼이 "정확히 1회"를 보장하지
// 않는 경우) 관리자의 "지금 수집"과 크론이 우연히 겹치면, 같은 "미완료 기사"를 두
// 실행이 동시에 집어 AI를 중복 호출할 수 있다 — DB 유니크 제약(urlHash, briefing
// upsert, uq_analyses_current)이 데이터 중복은 막아주지만 AI 비용 중복 지출과 레이스는
// 못 막는다. Postgres advisory lock은 Neon 같은 커넥션 풀링 환경에서 세션 경계가
// 안전하지 않아, 이미 세션 스토어/레이트리밋에 쓰고 있는 Redis로 아주 단순한
// mutex(SET NX)만 둔다 — 새 인프라 추가 없이 이 정도로 충분하다.
const PIPELINE_LOCK_KEY = "lock:daily-pipeline";
// TIME_BUDGET_MS(50s)·Vercel 함수 하드 타임아웃(60s)보다 넉넉히 잡아, 정상 실행 중에
// 락이 먼저 풀리는 일은 없게 한다. 그러면서도 함수가 강제 종료돼 finally가 못 돌아도
// 다음 크론(내일)까지 락이 영원히 남지 않도록 자동 만료시킨다.
const PIPELINE_LOCK_TTL_SECONDS = 120;

export interface DailyPipelineResult {
  resumedStuck: number;
  sourcesProcessed: number;
  sourcesFailed: number;
  sourcesSkipped: number;
  purgedCount: number;
  briefingGenerated: boolean;
  timedOut: boolean;
  /** 이번 실행 시작 시점에 이미 AI 일일 호출 한도를 넘어선 상태였는지 (관측용).
   *  실제 차단은 각 AI 호출 직전(dedupe.job.ts, briefing.service.ts)에서 매번
   *  다시 확인하므로, 이 값이 false여도 실행 도중 한도에 도달하면 그 시점부터는
   *  똑같이 막힌다. */
  aiBudgetExceeded: boolean;
  /** 다른 실행이 이미 진행 중이어서 이번 호출은 아무 작업도 하지 않고 바로
   *  종료했는지 (중복 실행 방지 락, 아래 PIPELINE_LOCK_KEY 참고). */
  skippedConcurrentRun: boolean;
  durationMs: number;
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function emptyResult(): DailyPipelineResult {
  return {
    resumedStuck: 0,
    sourcesProcessed: 0,
    sourcesFailed: 0,
    sourcesSkipped: 0,
    purgedCount: 0,
    briefingGenerated: false,
    timedOut: false,
    aiBudgetExceeded: false,
    skippedConcurrentRun: false,
    durationMs: 0,
  };
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
  const result = emptyResult();

  const lockToken = `${startedAt}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redis.set(PIPELINE_LOCK_KEY, lockToken, "EX", PIPELINE_LOCK_TTL_SECONDS, "NX");
  if (acquired !== "OK") {
    console.warn("[daily-pipeline] 이미 실행 중인 파이프라인이 있어 이번 호출은 건너뜁니다 (중복 실행 방지).");
    result.skippedConcurrentRun = true;
    result.durationMs = elapsedMs(startedAt);
    return result;
  }

  try {
    result.aiBudgetExceeded = await isAiBudgetExceeded();
    if (result.aiBudgetExceeded) {
      // 수집(RSS fetch) 자체는 AI 비용이 없으므로 계속 진행한다 — 새 기사는 그대로
      // collected/normalized 단계에 쌓이고, 내일 한도가 풀리면 "미완료 기사 재개"
      // 로직이 이어서 분석한다. 여기서 막는 건 분석/브리핑 등 AI 호출뿐이다.
      console.warn(
        `[daily-pipeline] AI 일일 호출 한도 도달 — 이번 실행은 신규 AI 분석/브리핑 생성을 건너뜁니다 (수집은 계속됨).`
      );
      await notifyMajorEvent(
        DEFAULT_ORG_ID,
        "AI 일일 호출 한도 도달",
        "오늘 AI 분석/브리핑 생성이 한도 초과로 건너뛰어졌습니다. 수집된 기사는 내일 한도가 초기화되면 이어서 분석됩니다."
      );
    }

    // 1) 이전 실행이 시간 제한으로 끊겨 미완료 상태(collected/normalized)로 남은
    //    기사를 이어서 처리한다. "failed"는 여기서 다시 시도하지 않는다 — AI 호출이
    //    이미 실패로 끝난 건이라 매일 재시도하면 예산만 소모될 수 있어, 필요하면
    //    관리자가 뉴스 관리 화면에서 수동으로 재처리하는 걸 기본으로 한다.
    const stuck = await findArticlesByPipelineStages(
      DEFAULT_ORG_ID,
      ["collected", "normalized"],
      STUCK_ARTICLE_LIMIT
    );
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
  } finally {
    // 락 소유자일 때만 해제한다 — TTL 만료로 이미 풀렸거나(강제 종료 등) 다른 실행이
    // 새로 잡았다면 건드리지 않는다. get+del 사이는 원자적이지 않지만, 최악의 경우도
    // TTL이 곧 자동으로 정리해준다.
    try {
      const owner = await redis.get(PIPELINE_LOCK_KEY);
      if (owner === lockToken) {
        await redis.del(PIPELINE_LOCK_KEY);
      }
    } catch (e) {
      console.error("[daily-pipeline] lock release failed (TTL로 자동 정리됨)", e);
    }
  }

  result.durationMs = elapsedMs(startedAt);
  return result;
}
