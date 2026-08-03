import { generateTodaysBriefing } from "@/server/services/briefing.service";
import { DEFAULT_ORG_ID } from "@/config/constants";

export async function runBriefingJob(): Promise<void> {
  await generateTodaysBriefing(DEFAULT_ORG_ID, "auto");
}
