import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { getOrgSettings, updateOrgSettings } from "@/server/services/settings.service";
import { orgSettingsPatchSchema } from "@/lib/schemas/settings.schema";
import { recordAudit } from "@/server/services/audit.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 설정을 조회할 수 있습니다.", 403);
  }

  const settings = await getOrgSettings(ctx.user.orgId);
  return apiOk(settings);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 설정을 변경할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = orgSettingsPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const settings = await updateOrgSettings(ctx.user.orgId, parsed.data);

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.settings.update",
      targetType: "organization",
      targetId: ctx.user.orgId,
      after: settings,
    });
  } catch (auditError) {
    console.error("[admin/settings] recordAudit failed after successful update", auditError);
  }

  return apiOk(settings);
}
