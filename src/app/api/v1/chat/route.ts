import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, verifyCsrf } from "@/server/auth/guard";
import { askQuestionSchema } from "@/lib/schemas/chat.schema";
import { askQuestion } from "@/server/services/qa.service";
import { AiGatewayError } from "@/server/ai/gateway";

/**
 * F-07 AI 질의응답. 관리자 전용이 아니다 — 로그인한 저축은행중앙회 직원이면 누구나
 * 쓸 수 있다(북마크/좋아요와 같은 로그인 요구 수준).
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = askQuestionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  try {
    const result = await askQuestion({
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      sessionId: parsed.data.sessionId,
      question: parsed.data.question,
    });
    return apiOk({
      sessionId: result.sessionId,
      answer: result.answer,
      citations: result.citations.map((c) => ({ ...c, publishedAt: c.publishedAt.toISOString() })),
    });
  } catch (e) {
    if (e instanceof AiGatewayError) {
      console.error("[api/chat] AI gateway error", e);
      return apiError(ErrorCode.AI_GENERATION_FAILED, "답변 생성에 실패했습니다. 잠시 후 다시 시도해주세요.", 502);
    }
    throw e;
  }
}
