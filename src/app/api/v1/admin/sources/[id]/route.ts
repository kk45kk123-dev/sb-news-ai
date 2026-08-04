import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { editSource, removeSource, updateSourceSchema } from "@/server/services/source.service";
import { findSourceById } from "@/server/repositories/source.repository";
import { recordAudit } from "@/server/services/audit.service";
import { Prisma } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const before = await findSourceById(id);
  if (!before) {
    return apiError(ErrorCode.NOT_FOUND, "출처를 찾을 수 없습니다.", 404);
  }

  const parsed = updateSourceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const source = await editSource(id, parsed.data);

  await recordAudit({
    orgId: ctx.user.orgId,
    userId: ctx.user.id,
    action: "admin.source.update",
    targetType: "source",
    targetId: id,
    before: { name: before.name, url: before.url, fetchIntervalMin: before.fetchIntervalMin, isActive: before.isActive },
    after: { name: source.name, url: source.url, fetchIntervalMin: source.fetchIntervalMin, isActive: source.isActive },
  });

  return apiOk(source);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const before = await findSourceById(id);
  if (!before) {
    return apiError(ErrorCode.NOT_FOUND, "출처를 찾을 수 없습니다.", 404);
  }

  try {
    await removeSource(id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "이미 수집된 기사가 있는 출처는 삭제할 수 없습니다. 대신 비활성화(isActive=false)하세요.",
        409
      );
    }
    throw e;
  }

  await recordAudit({
    orgId: ctx.user.orgId,
    userId: ctx.user.id,
    action: "admin.source.delete",
    targetType: "source",
    targetId: id,
    before: { name: before.name, url: before.url },
  });

  return apiOk({ deleted: true });
}
