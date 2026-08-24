import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { listNotifications, countUnreadNotifications, markAllNotificationsRead } from "@/server/repositories/notification.repository";

/**
 * 관리자 전용인 /api/v1/admin/notifications과 같은 테이블을 쓰지만, 이건 로그인한
 * 일반 이용자(키워드 워치 알림 등)를 위한 것이라 역할 제한이 없다. Notification.userId
 * 기준이라 본인에게 온 알림만 보인다.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiOk({ items: [], unreadCount: 0 });

  const [items, unreadCount] = await Promise.all([
    listNotifications(ctx.user.id),
    countUnreadNotifications(ctx.user.id),
  ]);
  return apiOk({ items, unreadCount });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  await markAllNotificationsRead(ctx.user.id);
  return apiOk({ marked: true });
}
