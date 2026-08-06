import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { recordAudit } from "@/server/services/audit.service";
import { editManualArticle, removeManualArticle } from "@/server/services/manual-publish.service";

const patchSchema = z.object({
  title: z.string().min(5).optional(),
  categoryId: z.string().min(1).optional(),
  status: z.enum(["published", "scheduled", "draft"]).optional(),
  scheduledAt: z.string().nullable().optional(),
  summaryBullets: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
  body: z.string().min(30).optional(),
});

/** Edits a manually-published article — same table the public site reads, so this reflects immediately. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "기사 수정 권한이 없습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const { id } = await params;
  const updated = await editManualArticle(id, ctx.user.orgId, parsed.data);
  if (!updated) {
    return apiError(ErrorCode.NOT_FOUND, "기사를 찾을 수 없습니다.", 404);
  }

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.article.update",
      targetType: "article",
      targetId: id,
      after: parsed.data,
    });
  } catch (auditError) {
    console.error("[admin/articles/[id]] recordAudit failed after successful update", auditError);
  }

  return apiOk(updated);
}

/** Deletes a manually-published article — same table the public site reads, so this disappears immediately. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 삭제할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const deleted = await removeManualArticle(id, ctx.user.orgId);
  if (!deleted) {
    return apiError(ErrorCode.NOT_FOUND, "기사를 찾을 수 없습니다.", 404);
  }

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.article.delete",
      targetType: "article",
      targetId: id,
    });
  } catch (auditError) {
    console.error("[admin/articles/[id]] recordAudit failed after successful delete", auditError);
  }

  return apiOk({ deleted: true });
}
