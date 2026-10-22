import { apiOk } from "@/lib/api-response";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getUpcomingEvents } from "@/server/services/economic-event.service";

/** 개인화 없는 공개 데이터라 market처럼 짧게 캐시한다. */
export async function GET() {
  const events = await getUpcomingEvents(DEFAULT_ORG_ID);
  const res = apiOk(events);
  res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res;
}
