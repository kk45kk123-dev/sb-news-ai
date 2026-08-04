import Redis from "ioredis";
import { env } from "@/config/env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

// lazyConnect: defers the actual TCP connection to the first command instead
// of opening it at module import time — avoids noisy connection attempts
// during `next build`'s static-page analysis (and serverless cold starts)
// touching this module without ever issuing a command.
export const redis = globalForRedis.redis ?? new Redis(env.REDIS_URL, { lazyConnect: true });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
