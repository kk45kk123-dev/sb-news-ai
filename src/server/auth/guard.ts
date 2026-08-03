import type { NextRequest } from "next/server";
import type { User } from "@prisma/client";
import { getSession } from "./session";
import { findUserById } from "@/server/repositories/user.repository";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from "./constants";

export { hasRole } from "./rbac";

export interface AuthContext {
  user: User;
  sessionToken: string;
  csrfToken: string;
}

type CookieReader = { get(name: string): { value: string } | undefined };

async function resolveAuthContext(cookies: CookieReader): Promise<AuthContext | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || !user.isActive) return null;

  return { user, sessionToken: token, csrfToken: session.csrfToken };
}

/**
 * 세션 쿠키를 검증하고 활성 사용자를 반환한다 (Route Handler용). 세션이 없거나, 만료됐거나,
 * 계정이 비활성화(is_active=false)됐으면 null을 반환한다 — 라우트가 401로 응답해야 한다.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  return resolveAuthContext(req.cookies);
}

/** 서버 컴포넌트(페이지)용 — next/headers의 cookies()를 그대로 넘긴다. */
export async function getAuthContextForPage(cookies: CookieReader): Promise<AuthContext | null> {
  return resolveAuthContext(cookies);
}

/**
 * 상태 변경 요청(POST/PUT/DELETE)에 대한 CSRF 검증 (§16.3).
 * 세션 생성 시 발급된 csrf 토큰과 요청 헤더의 값이 일치해야 한다 (double-submit).
 */
export function verifyCsrf(req: NextRequest, ctx: AuthContext): boolean {
  const headerToken = req.headers.get("x-csrf-token");
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  return Boolean(headerToken) && headerToken === ctx.csrfToken && headerToken === cookieToken;
}
