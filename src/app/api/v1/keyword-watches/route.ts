import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { createWatchSchema } from "@/lib/schemas/keyword-watch.schema";
import { getMyWatches, addWatch, TooManyWatchesError, DuplicateWatchError } from "@/server/services/keyword-watch.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);

  const watches = await getMyWatches(ctx.user.id);
  return apiOk(watches.map((w) => ({ id: w.id, keyword: w.keyword, minImpact: w.minImpact, isActive: w.isActive })));
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = createWatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  try {
    const watch = await addWatch(ctx.user.id, parsed.data.keyword, parsed.data.minImpact ?? undefined);
    return apiOk(
      { id: watch.id, keyword: watch.keyword, minImpact: watch.minImpact, isActive: watch.isActive },
      undefined,
      201
    );
  } catch (e) {
    if (e instanceof TooManyWatchesError || e instanceof DuplicateWatchError) {
      return apiError(ErrorCode.VALIDATION_ERROR, e.message, 400);
    }
    throw e;
  }
}
