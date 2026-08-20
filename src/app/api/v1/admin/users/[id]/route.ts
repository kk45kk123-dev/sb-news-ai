import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import {
  findOrgUserById,
  setUserActive,
  setUserRole,
  countActiveAdmins,
  softDeleteUser,
} from "@/server/repositories/user.repository";
import { recordAudit } from "@/server/services/audit.service";

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(["admin", "viewer"]).optional(),
  })
  .refine((d) => d.isActive !== undefined || d.role !== undefined, {
    message: "변경할 값이 없습니다.",
  });

/** 관리자가 조직 내 다른 사용자의 상태(정지/활성)·권한(관리자/일반)을 바꾼다. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 사용자를 관리할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const target = await findOrgUserById(id, ctx.user.orgId);
  if (!target) {
    return apiError(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다.", 404);
  }

  // 자기 자신을 정지하거나 관리자 권한을 스스로 내려놓으면 관리 콘솔에서 즉시
  // 튕겨나가 아무도 되돌릴 수 없는 상태가 될 수 있다 — 다른 관리자가 대신 처리해야 한다.
  if (target.id === ctx.user.id) {
    return apiError(ErrorCode.VALIDATION_ERROR, "본인 계정은 여기서 변경할 수 없습니다.", 400);
  }

  // 마지막 남은 활성 관리자를 정지/강등하면 아무도 관리 콘솔에 못 들어가는 상태가 된다.
  const demotingOrSuspendingAdmin =
    target.role === "admin" &&
    target.isActive &&
    ((parsed.data.isActive === false) || (parsed.data.role === "viewer"));
  if (demotingOrSuspendingAdmin) {
    const activeAdmins = await countActiveAdmins(ctx.user.orgId);
    if (activeAdmins <= 1) {
      return apiError(ErrorCode.VALIDATION_ERROR, "마지막 남은 관리자는 정지하거나 권한을 내릴 수 없습니다.", 400);
    }
  }

  const before = { isActive: target.isActive, role: target.role };
  let updated = target;
  if (parsed.data.isActive !== undefined) {
    updated = (await setUserActive(id, ctx.user.orgId, parsed.data.isActive)) ?? updated;
  }
  if (parsed.data.role !== undefined) {
    updated = (await setUserRole(id, ctx.user.orgId, parsed.data.role)) ?? updated;
  }

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.user.update",
      targetType: "user",
      targetId: id,
      before,
      after: { isActive: updated.isActive, role: updated.role },
    });
  } catch (auditError) {
    console.error("[admin/users/[id]] recordAudit failed after successful update", auditError);
  }

  return apiOk({ id: updated.id, isActive: updated.isActive, role: updated.role });
}

/**
 * 계정을 "삭제"한다 — 실제 행은 지우지 않고 소프트 삭제한다(softDeleteUser 주석
 * 참고: 로그인 이력이 있는 계정은 FK 제약 때문에 진짜 DELETE가 거의 항상 실패한다).
 * isActive도 함께 꺼지므로 삭제된 계정은 기존 로그인 로직(auth.service.ts의
 * login())이 그대로 차단한다 — 정지된 계정과 동일한 경로다.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 사용자를 관리할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const target = await findOrgUserById(id, ctx.user.orgId);
  if (!target) {
    return apiError(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다.", 404);
  }
  if (target.deletedAt) {
    return apiError(ErrorCode.NOT_FOUND, "이미 삭제된 사용자입니다.", 404);
  }

  // PATCH와 같은 이유: 본인 계정을 스스로 삭제하면 관리 콘솔에서 즉시 튕겨나가
  // 아무도 되돌릴 수 없다.
  if (target.id === ctx.user.id) {
    return apiError(ErrorCode.VALIDATION_ERROR, "본인 계정은 여기서 삭제할 수 없습니다.", 400);
  }

  // 마지막 남은 활성 관리자를 삭제하면 아무도 관리 콘솔에 못 들어가는 상태가 된다.
  if (target.role === "admin" && target.isActive) {
    const activeAdmins = await countActiveAdmins(ctx.user.orgId);
    if (activeAdmins <= 1) {
      return apiError(ErrorCode.VALIDATION_ERROR, "마지막 남은 관리자는 삭제할 수 없습니다.", 400);
    }
  }

  const deleted = await softDeleteUser(id, ctx.user.orgId);
  if (!deleted) {
    return apiError(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다.", 404);
  }

  try {
    await recordAudit({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      action: "admin.user.delete",
      targetType: "user",
      targetId: id,
      before: { isActive: target.isActive, role: target.role, deletedAt: null },
      after: { isActive: deleted.isActive, role: deleted.role, deletedAt: deleted.deletedAt },
    });
  } catch (auditError) {
    console.error("[admin/users/[id]] recordAudit failed after successful delete", auditError);
  }

  return apiOk({ id: deleted.id });
}
