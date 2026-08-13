import { apiOk } from "@/lib/api-response";
import { getMarketSnapshot } from "@/server/services/market.service";

// 서비스 계층이 이미 Redis로 120초 TTL 캐싱을 하고 있지만(market.service.ts의
// SNAPSHOT_CACHE_TTL_SECONDS), 매 요청마다 Route Handler + Redis 왕복 자체는
// 여전히 발생한다. 개인화 데이터가 없는 순수 공개 스냅샷이라 HTTP 레벨에서도
// 안전하게 캐시할 수 있어, CDN/브라우저가 반복 요청을 아예 흡수하도록 헤더를 더한다.
export async function GET() {
  const snapshot = await getMarketSnapshot();
  const res = apiOk(snapshot);
  res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return res;
}
