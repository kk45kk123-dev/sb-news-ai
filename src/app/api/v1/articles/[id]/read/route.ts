import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { markAsRead } from "@/server/repositories/user-article-state.repository";
import { bumpViewCount } from "@/server/repositories/article.repository";

/**
 * Two independent things happen here: the public view counter (anyone,
 * no login — matches the old mock's incrementView, called unconditionally
 * on every detail-page visit) and the per-user "read" state that powers
 * 최근 본 기사 (requires login, since it's tied to an account now).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await bumpViewCount(id);

  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiOk({ isRead: false });
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  await markAsRead(ctx.user.id, id);
  return apiOk({ isRead: true });
}
