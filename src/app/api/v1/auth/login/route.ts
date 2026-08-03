import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { login, InvalidCredentialsError } from "@/server/services/auth.service";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { DEFAULT_ORG_ID } from "@/config/constants";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
  LOGIN_RATE_LIMIT_PER_MINUTE,
} from "@/server/auth/constants";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimit = await checkRateLimit(`ratelimit:login:${ip}`, LOGIN_RATE_LIMIT_PER_MINUTE, 60);
  if (!rateLimit.allowed) {
    return apiError(ErrorCode.RATE_LIMITED, "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, "이메일과 비밀번호를 확인하세요.", 400);
  }

  try {
    const result = await login({
      orgId: DEFAULT_ORG_ID,
      email: parsed.data.email,
      password: parsed.data.password,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const res = apiOk({ user: result.user });
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
    });
    res.cookies.set(CSRF_COOKIE_NAME, result.csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
    });
    return res;
  } catch (e) {
    if (e instanceof InvalidCredentialsError) {
      return apiError(ErrorCode.INVALID_CREDENTIALS, e.message, 401);
    }
    throw e;
  }
}
