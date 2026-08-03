import { Worker } from "bullmq";
import { createBullConnection } from "@/server/pipeline/connection";
import { QUEUE_NAMES, SCHEDULER_TICK_CRON, PURGE_CRON } from "@/server/pipeline/constants";
import { runCollectJob } from "@/server/pipeline/collect.job";
import { runNormalizeJob } from "@/server/pipeline/normalize.job";
import { runDedupeJob } from "@/server/pipeline/dedupe.job";
import { runPurgeJob } from "@/server/pipeline/purge.job";
import { runSchedulerTick } from "@/server/pipeline/scheduler-tick.job";
import { schedulerQueue, purgeQueue, type CollectJobData, type NormalizeJobData, type DedupeJobData } from "@/server/pipeline/queues";

const connection = createBullConnection();

// analyze 큐의 워커는 Task #6(AI Gateway)에서 등록한다 — 그 전까지 analyze 잡은
// 큐에 쌓인 채 대기한다(정상적인 중간 상태).
new Worker<CollectJobData>(QUEUE_NAMES.collect, (job) => runCollectJob(job.data), { connection });
new Worker<NormalizeJobData>(QUEUE_NAMES.normalize, (job) => runNormalizeJob(job.data), {
  connection,
});
new Worker<DedupeJobData>(QUEUE_NAMES.dedupe, (job) => runDedupeJob(job.data), { connection });
new Worker(QUEUE_NAMES.purge, () => runPurgeJob(), { connection });
new Worker(QUEUE_NAMES.scheduler, () => runSchedulerTick(), { connection });

async function scheduleRepeatingJobs() {
  await schedulerQueue.add("tick", {}, { repeat: { pattern: SCHEDULER_TICK_CRON } });
  await purgeQueue.add("daily-purge", {}, { repeat: { pattern: PURGE_CRON } });
}

scheduleRepeatingJobs()
  .then(() => {
    console.log("[worker] pipeline workers started, repeating jobs scheduled");
  })
  .catch((e) => {
    console.error("[worker] failed to schedule repeating jobs", e);
    process.exit(1);
  });
