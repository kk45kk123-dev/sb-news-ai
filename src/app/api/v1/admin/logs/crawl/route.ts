import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole } from "@/server/auth/guard";
import { listCrawlLogs } from "@/server/repositories/log-query.repository";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.", 403);
  }

  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  const { items, total } = await listCrawlLogs(offset);
  return apiOk(items, { total });
}
