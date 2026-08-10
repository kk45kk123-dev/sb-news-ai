import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { generateTodaysBriefing } from "@/server/services/briefing.service";
import { AiGatewayError } from "@/server/ai/gateway";
import { AiBudgetExceededError } from "@/server/ai/budget";
import { recordAudit } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 브리핑을 재생성할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const auditMeta = {
    orgId: ctx.user.orgId,
    userId: ctx.user.id,
    action: "admin.briefing.regenerate",
    targetType: "briefing",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };

  let briefing;
  try {
    briefing = await generateTodaysBriefing(ctx.user.orgId, "manual");
  } catch (e) {
    try {
      await recordAudit({ ...auditMeta, after: { success: false } });
    } catch (auditError) {
      console.error("[admin/briefings/regenerate] recordAudit failed after generation failure", auditError);
    }
    if (e instanceof AiBudgetExceededError) {
      return apiError(ErrorCode.RATE_LIMITED, "오늘 AI 처리 한도에 도달했습니다. 내일 다시 시도해 주세요.", 429);
    }
    if (e instanceof AiGatewayError) {
      return apiError(ErrorCode.AI_GENERATION_FAILED, "브리핑 생성에 실패했습니다. AI 모델/프롬프트 설정을 확인하세요.", 502);
    }
    throw e;
  }

  try {
    await recordAudit({ ...auditMeta, after: { success: true, hasBriefing: briefing !== null } });
  } catch (auditError) {
    console.error("[admin/briefings/regenerate] recordAudit failed after success", auditError);
  }

  if (!briefing) {
    return apiError(ErrorCode.NOT_FOUND, "브리핑을 생성할 뉴스가 없습니다 (분석 완료된 기사 0건).", 404);
  }
  return apiOk(briefing);
}
