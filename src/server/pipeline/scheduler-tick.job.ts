import { listDueSources } from "@/server/repositories/source.repository";
import { collectQueue } from "./queues";

/**
 * 매 1분(SCHEDULER_TICK_CRON) 실행. 출처별 fetch_interval_min이 지난 활성 출처를 찾아
 * collect 잡을 큐에 넣는다. 관리자가 출처를 추가/주기 변경해도 코드 배포 없이 다음 틱부터
 * 반영된다 (F-01 수용 기준, §21 개발 원칙 "하드코딩 금지").
 */
export async function runSchedulerTick(): Promise<{ enqueued: number }> {
  const due = await listDueSources(new Date());
  for (const source of due) {
    await collectQueue.add("collect", { sourceId: source.id });
  }
  return { enqueued: due.length };
}
