import IORedis from "ioredis";
import { env } from "@/config/env";

// BullMQ는 블로킹 커맨드를 사용하므로 세션/캐시용 redis 클라이언트와 별도의
// 커넥션을 쓴다 (BullMQ 요구사항: maxRetriesPerRequest=null, enableReadyCheck=false).
export function createBullConnection(): IORedis {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
