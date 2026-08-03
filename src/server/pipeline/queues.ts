import { Queue } from "bullmq";
import { createBullConnection } from "./connection";
import { QUEUE_NAMES, JOB_RETRY_ATTEMPTS, JOB_BACKOFF_BASE_MS } from "./constants";

const connection = createBullConnection();

const defaultJobOptions = {
  attempts: JOB_RETRY_ATTEMPTS,
  backoff: { type: "exponential" as const, delay: JOB_BACKOFF_BASE_MS },
  removeOnComplete: { age: 24 * 60 * 60 }, // 완료 잡은 24시간 후 정리 (큐 비대화 방지)
  removeOnFail: false, // 실패 잡은 DLQ 조사를 위해 남겨둔다 (§5.2)
};

export interface CollectJobData {
  sourceId: string;
}
export interface NormalizeJobData {
  articleId: string;
}
export interface DedupeJobData {
  articleId: string;
}
export interface AnalyzeJobData {
  articleId: string;
}

export const collectQueue = new Queue<CollectJobData>(QUEUE_NAMES.collect, {
  connection,
  defaultJobOptions,
});
export const normalizeQueue = new Queue<NormalizeJobData>(QUEUE_NAMES.normalize, {
  connection,
  defaultJobOptions,
});
export const dedupeQueue = new Queue<DedupeJobData>(QUEUE_NAMES.dedupe, {
  connection,
  defaultJobOptions,
});
// analyze 큐는 Task #6(AI Gateway)에서 워커(processor)를 등록한다.
// 지금은 dedupe 단계가 여기로 잡을 넣기만 하고, 아직 소비자가 없다 — 정상적인 중간 상태다.
export const analyzeQueue = new Queue<AnalyzeJobData>(QUEUE_NAMES.analyze, {
  connection,
  defaultJobOptions,
});
export const purgeQueue = new Queue(QUEUE_NAMES.purge, { connection, defaultJobOptions });
export const schedulerQueue = new Queue(QUEUE_NAMES.scheduler, { connection, defaultJobOptions });
