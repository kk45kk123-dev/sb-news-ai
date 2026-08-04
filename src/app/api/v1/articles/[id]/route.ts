import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { getArticleDetail } from "@/server/services/article.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const article = await getArticleDetail(id, ctx.user.id);
  if (!article) {
    return apiError(ErrorCode.NOT_FOUND, "기사를 찾을 수 없습니다.", 404);
  }

  return apiOk(article);
}
