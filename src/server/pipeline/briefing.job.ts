import { generateTodaysBriefing } from "@/server/services/briefing.service";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { AiBudgetExceededError } from "@/server/ai/budget";

/**
 * false를 반환하는 건 실패가 아니라 "오늘 브리핑 후보가 될 기사가 없었다" 또는
 * "AI 일일 호출 한도에 도달해 오늘은 건너뛰었다"는 뜻이다 — 후자는 여기서 잡아서
 * (run-daily-pipeline.ts가 이걸 일반 에러로 오인해 "생성 실패"로 로그를 남기지
 * 않도록) 정상 종료로 취급한다.
 */
export async function runBriefingJob(): Promise<boolean> {
  try {
    const briefing = await generateTodaysBriefing(DEFAULT_ORG_ID, "auto");
    return briefing !== null;
  } catch (e) {
    if (e instanceof AiBudgetExceededError) {
      console.warn("[briefing-job] AI 일일 호출 한도 도달 — 오늘 브리핑 생성을 건너뜁니다.");
      return false;
    }
    throw e;
  }
}
