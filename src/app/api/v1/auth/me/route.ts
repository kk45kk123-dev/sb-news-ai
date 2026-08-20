import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { updateProfileSchema } from "@/lib/schemas/user.schema";
import { updateUserName } from "@/server/repositories/user.repository";
import { recordAudit } from "@/server/services/audit.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  return apiOk({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    department: ctx.user.department,
  });
}

/** 본인 프로필(이름)을 스스로 수정한다 — 일반회원/관리자 구분 없이 로그인한 계정이면
 *  누구나 자신의 이름을 바꿀 수 있다. 관리자가 다른 사용자를 바꾸는 경로는 별도
 *  (api/v1/admin/users/[id] PATCH)이며, 이 라우트는 항상 ctx.user(본인)만 대상으로 한다. */
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = updateProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const before = ctx.user.name;
  const updated = await updateUserName(ctx.user.id, parsed.data.name);

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "user.profile.update",
      targetType: "user",
      targetId: ctx.user.id,
      before: { name: before },
      after: { name: updated.name },
    });
  } catch (auditError) {
    console.error("[auth/me] recordAudit failed after successful profile update", auditError);
  }

  return apiOk({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, department: updated.department });
}
