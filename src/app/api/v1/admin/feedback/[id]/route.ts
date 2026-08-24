import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { feedbackStatusSchema } from "@/lib/schemas/feedback.schema";
import { findFeedbackOrgId, updateFeedbackStatus } from "@/server/repositories/feedback.repository";

const patchSchema = z.object({ status: feedbackStatusSchema });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "접근 권한이 없습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const orgId = await findFeedbackOrgId(id);
  if (!orgId || orgId !== ctx.user.orgId) {
    return apiError(ErrorCode.NOT_FOUND, "피드백을 찾을 수 없습니다.", 404);
  }

  const updated = await updateFeedbackStatus(id, parsed.data.status, ctx.user.id);
  return apiOk({ id: updated.id, status: updated.status });
}
