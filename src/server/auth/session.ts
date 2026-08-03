import { randomBytes } from "node:crypto";
import { redis } from "@/server/redis/client";
import { SESSION_IDLE_TIMEOUT_SECONDS, SESSION_REDIS_PREFIX } from "./constants";

export interface SessionData {
  userId: string;
  csrfToken: string;
  createdAt: string;
}

function redisKey(token: string): string {
  return `${SESSION_REDIS_PREFIX}${token}`;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * 새 세션을 만들고 Redis에 저장한다. 세션 토큰과 CSRF 토큰을 함께 반환한다.
 * 세션 자체는 로그인 성공 시에만 생성된다 — 실패한 로그인 시도는 세션을 만들지 않는다.
 */
export async function createSession(userId: string): Promise<{ token: string; csrfToken: string }> {
  const token = generateToken();
  const csrfToken = generateToken();
  const data: SessionData = { userId, csrfToken, createdAt: new Date().toISOString() };
  await redis.set(redisKey(token), JSON.stringify(data), "EX", SESSION_IDLE_TIMEOUT_SECONDS);
  return { token, csrfToken };
}

/**
 * 세션을 조회하고, 유효하면 유휴 타이머를 갱신한다 (sliding expiration, §16.1).
 * 세션이 없거나 만료됐으면 null.
 */
export async function getSession(token: string): Promise<SessionData | null> {
  const raw = await redis.get(redisKey(token));
  if (!raw) return null;
  await redis.expire(redisKey(token), SESSION_IDLE_TIMEOUT_SECONDS);
  return JSON.parse(raw) as SessionData;
}

export async function destroySession(token: string): Promise<void> {
  await redis.del(redisKey(token));
}
