import { purgeExpiredRawContent } from "@/server/repositories/article.repository";
import { RAW_CONTENT_RETENTION_DAYS } from "./constants";

/**
 * §20-1 하드 제약: raw_content는 분석용 임시 데이터이며 보존기간(7일) 경과 후
 * 반드시 NULL 처리해야 한다. "이 배치는 MVP부터 구현한다"고 명시되어 있어
 * Phase 2로 미루지 않는다.
 */
export async function runPurgeJob(): Promise<{ purgedCount: number }> {
  const cutoff = new Date(Date.now() - RAW_CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const purgedCount = await purgeExpiredRawContent(cutoff);
  return { purgedCount };
}
