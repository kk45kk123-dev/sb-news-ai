import { generateTodaysBriefing } from "@/server/services/briefing.service";
import { DEFAULT_ORG_ID } from "@/config/constants";

/** false를 반환하는 건 실패가 아니라 "오늘 브리핑 후보가 될 기사가 없었다"는 뜻이다. */
export async function runBriefingJob(): Promise<boolean> {
  const briefing = await generateTodaysBriefing(DEFAULT_ORG_ID, "auto");
  return briefing !== null;
}
