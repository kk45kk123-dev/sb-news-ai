import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getPublicNewsDetail } from "@/server/services/article.service";

/** Public reader-facing detail — open to anonymous visitors, same as the old mock. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  const { id } = await params;

  const article = await getPublicNewsDetail(id, ctx?.user.orgId ?? DEFAULT_ORG_ID, ctx?.user.id);
  if (!article) {
    return apiError(ErrorCode.NOT_FOUND, "기사를 찾을 수 없습니다.", 404);
  }

  return apiOk(article);
}
