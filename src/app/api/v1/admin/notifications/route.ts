import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { listNotifications, countUnreadNotifications, markAllNotificationsRead } from "@/server/repositories/notification.repository";

/** 로그인한 관리자 본인의 알림함 — Notification.userId 기준이라 org 전체가 아닌 나에게 온 알림만 보인다. */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 조회할 수 있습니다.", 403);
  }

  const [items, unreadCount] = await Promise.all([
    listNotifications(ctx.user.id),
    countUnreadNotifications(ctx.user.id),
  ]);
  return apiOk({ items, unreadCount });
}

/** 전체 읽음 처리. */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 처리할 수 있습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  await markAllNotificationsRead(ctx.user.id);
  return apiOk({ marked: true });
}
