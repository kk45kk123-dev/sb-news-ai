import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole } from "@/server/auth/guard";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { publicNewsListQuerySchema, listPublicNews } from "@/server/services/article.service";

// PROJECT_SPEC.md §16.3: "검색 60회/분" — 익명 방문자도 쓰는 목록/검색 겸용
// 엔드포인트라 세션이 아닌 IP 기준으로 제한한다.
const SEARCH_RATE_LIMIT_PER_MINUTE = 60;

/**
 * Public reader-facing list — browsing itself needs no session (matches the
 * old mock's open-to-everyone UX); an admin/editor session additionally sees
 * draft/scheduled articles via includeAllStatuses.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimit = await checkRateLimit(`ratelimit:articles:${ip}`, SEARCH_RATE_LIMIT_PER_MINUTE, 60);
  if (!rateLimit.allowed) {
    return apiError(ErrorCode.RATE_LIMITED, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const ctx = await getAuthContext(req);

  const parsed = publicNewsListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const canSeeAllStatuses = !!ctx && hasRole(ctx.user.role, ["admin"]);
  const result = await listPublicNews(ctx?.user.orgId ?? DEFAULT_ORG_ID, {
    ...parsed.data,
    includeAllStatuses: canSeeAllStatuses ? parsed.data.includeAllStatuses : false,
  });

  return apiOk(result);
}
