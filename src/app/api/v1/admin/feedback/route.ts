import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole } from "@/server/auth/guard";
import { listFeedback } from "@/server/repositories/feedback.repository";
import { feedbackStatusSchema } from "@/lib/schemas/feedback.schema";

/** F-12 축소판 검수 큐. status 쿼리 파라미터 없으면 전체(open+reviewed+resolved)를 반환한다. */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "접근 권한이 없습니다.", 403);
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const parsedStatus = statusParam ? feedbackStatusSchema.safeParse(statusParam) : undefined;
  const status = parsedStatus?.success ? parsedStatus.data : undefined;

  const rows = await listFeedback(ctx.user.orgId, status);
  return apiOk(
    rows.map((f) => ({
      id: f.id,
      type: f.type,
      comment: f.comment,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      userName: f.user.name,
      articleId: f.analysis.article.id,
      articleTitle: f.analysis.article.title,
    }))
  );
}
