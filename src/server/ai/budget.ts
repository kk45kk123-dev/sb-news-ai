import { env } from "@/config/env";
import { countAiCallsSince } from "@/server/repositories/ai-call-log.repository";

const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

// 이 프로젝트 규모(§17.1: 하루 수집 50~100건, 기사당 분석 1회=스키마 재시도 포함 최대
// 2회 호출 + 브리핑 1회)를 기준으로 여유 있게 잡은 기본값. 필요하면 AI_DAILY_CALL_LIMIT
// 환경변수로 조정한다.
const DEFAULT_DAILY_LIMIT = 300;

export const AI_DAILY_CALL_LIMIT = env.AI_DAILY_CALL_LIMIT ?? DEFAULT_DAILY_LIMIT;

export class AiBudgetExceededError extends Error {
  constructor() {
    super(`AI 일일 호출 한도(${AI_DAILY_CALL_LIMIT}건/24시간)를 초과했습니다.`);
    this.name = "AiBudgetExceededError";
  }
}

/**
 * AI 예산 가드. ai_call_logs(실제 AI 제공자 호출 기록, 스키마 재시도 포함)를 최근
 * 24시간 롤링 윈도우로 세어 하루 한도 초과 여부를 판단한다.
 *
 * 별도 카운터/상태를 두지 않고 매번 DB(유일한 근거)를 조회하는 이유: 크론이 중복
 * 실행되거나 서버리스 인스턴스가 매번 새로 뜨는(무상태) 환경에서도, 그리고 관리자가
 * "지금 수집"이나 "브리핑 재생성"을 수동으로 눌러도 항상 실제 호출량과 정확히 맞는다.
 */
export async function isAiBudgetExceeded(): Promise<boolean> {
  const since = new Date(Date.now() - ROLLING_WINDOW_MS);
  const used = await countAiCallsSince(since);
  return used >= AI_DAILY_CALL_LIMIT;
}
