import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { signup, DuplicateEmailError } from "@/server/services/auth.service";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { validatePasswordPolicy } from "@/server/auth/password";
import { DEFAULT_ORG_ID } from "@/config/constants";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
  SIGNUP_RATE_LIMIT_PER_MINUTE,
} from "@/server/auth/constants";

const signupBodySchema = z
  .object({
    name: z.string().trim().min(2, "이름은 2자 이상 입력해주세요."),
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z.string().min(1, "비밀번호를 입력해주세요."),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

/**
 * No CSRF check here, mirroring /api/v1/auth/login — signup issues the very
 * first session/CSRF cookie a visitor gets, so there's nothing to double-submit
 * against yet. Not logged in yet either, so no session-based auth applies.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimit = await checkRateLimit(`ratelimit:signup:${ip}`, SIGNUP_RATE_LIMIT_PER_MINUTE, 60);
  if (!rateLimit.allowed) {
    return apiError(ErrorCode.RATE_LIMITED, "회원가입 시도가 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
  }

  const parsed = signupBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.", 400);
  }

  const policyError = validatePasswordPolicy(parsed.data.password);
  if (policyError) {
    return apiError(ErrorCode.VALIDATION_ERROR, policyError, 400);
  }

  try {
    const result = await signup({
      orgId: DEFAULT_ORG_ID,
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const res = apiOk({ user: result.user }, undefined, 201);
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
    if (e instanceof DuplicateEmailError) {
      return apiError(ErrorCode.VALIDATION_ERROR, e.message, 409);
    }
    console.error("[auth/signup] failed", e);
    return apiError(ErrorCode.INTERNAL_ERROR, "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 500);
  }
}
