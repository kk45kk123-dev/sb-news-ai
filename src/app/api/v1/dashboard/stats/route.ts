import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { getDashboardStats } from "@/server/services/dashboard.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }

  const stats = await getDashboardStats(ctx.user.orgId, ctx.user.id);
  return apiOk(stats);
}
