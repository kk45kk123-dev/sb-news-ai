// 매직 넘버 금지 (§18.1) — 파이프라인 관련 상수는 여기서만 관리한다.

// BullMQ 큐 이름은 콜론을 허용하지 않는다 (런타임에서 확인됨) — 대시로 구분한다.
export const QUEUE_NAMES = {
  collect: "pipeline-collect",
  normalize: "pipeline-normalize",
  dedupe: "pipeline-dedupe",
  analyze: "pipeline-analyze",
  purge: "pipeline-purge",
  scheduler: "pipeline-scheduler",
} as const;

export const JOB_RETRY_ATTEMPTS = 3; // §5.2: 지수 백오프 재시도(최대 3회) 후 DLQ
export const JOB_BACKOFF_BASE_MS = 5_000;

export const SOURCE_MAX_CONSECUTIVE_FAILURES = 3; // §F-01: 3회 연속 실패 시 status='error'

export const SCHEDULER_TICK_CRON = "* * * * *"; // 매 1분, 수집 주기가 된 출처를 큐에 넣는다
export const PURGE_CRON = "0 3 * * *"; // 매일 03:00, raw_content 보존기간 경과분 삭제 (§20-1)
export const RAW_CONTENT_RETENTION_DAYS = 7; // §8.2
