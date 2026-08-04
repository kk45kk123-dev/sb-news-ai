import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { setBookmark } from "@/server/repositories/user-article-state.repository";

const bodySchema = z.object({
  bookmarked: z.boolean(),
  folder: z.string().trim().min(1).max(100).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, "bookmarked(boolean)가 필요합니다.", 400);
  }

  const { id } = await params;
  await setBookmark(ctx.user.id, id, parsed.data.bookmarked, parsed.data.folder);
  return apiOk({ bookmarked: parsed.data.bookmarked });
}
