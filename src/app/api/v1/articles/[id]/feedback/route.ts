import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { submitFeedbackSchema } from "@/lib/schemas/feedback.schema";
import { getMyFeedback, submitFeedback, NoCurrentAnalysisError } from "@/server/services/feedback.service";

/** 로그인 사용자만 — 좋아요/북마크와 같은 로그인 요구 수준. 자신의 피드백 상태만 노출한다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiOk({ type: null });

  const { id } = await params;
  const type = await getMyFeedback(ctx.user.id, id);
  return apiOk({ type });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const { id } = await params;
  const parsed = submitFeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  try {
    const result = await submitFeedback({
      userId: ctx.user.id,
      articleId: id,
      type: parsed.data.type,
      comment: parsed.data.comment,
    });
    return apiOk({ type: result?.type ?? null });
  } catch (e) {
    if (e instanceof NoCurrentAnalysisError) {
      return apiError(ErrorCode.NOT_FOUND, e.message, 404);
    }
    throw e;
  }
}
