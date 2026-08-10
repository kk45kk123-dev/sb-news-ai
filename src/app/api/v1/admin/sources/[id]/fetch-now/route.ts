import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { triggerFetchNow, type FetchNowResult } from "@/server/services/source.service";
import { recordAudit } from "@/server/services/audit.service";

// 새 기사가 여럿이면 기사마다 AI 분석 호출이 이어져 시간이 걸릴 수 있다 — 기본
// 서버리스 제한보다 넉넉하게 잡는다 (daily-pipeline 크론과 동일한 상한).
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  let result: FetchNowResult;
  try {
    result = await triggerFetchNow(id);
  } catch (e) {
    return apiError(ErrorCode.NOT_FOUND, e instanceof Error ? e.message : "출처를 찾을 수 없습니다.", 404);
  }

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.source.fetch_now",
      targetType: "source",
      targetId: id,
      after: { ...result },
    });
  } catch (auditError) {
    console.error("[admin/sources/[id]/fetch-now] recordAudit failed", auditError);
  }

  return apiOk(result);
}
