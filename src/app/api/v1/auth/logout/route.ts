import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { logout } from "@/server/services/auth.service";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from "@/server/auth/constants";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  await logout(ctx.sessionToken, ctx.user.orgId, ctx.user.id, {
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  const res = apiOk({ loggedOut: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.delete(CSRF_COOKIE_NAME);
  return res;
}
