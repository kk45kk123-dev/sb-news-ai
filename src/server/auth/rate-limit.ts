import { redis } from "@/server/redis/client";

/**
 * 고정 윈도우 레이트리밋 (§16.3: 로그인 5회/분, AI 질의응답 20회/시간, 검색 60회/분 등).
 * key는 호출부에서 용도별로 구성한다 (예: `ratelimit:login:<ip>`).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
