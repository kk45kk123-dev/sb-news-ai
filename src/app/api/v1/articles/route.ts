import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { publicNewsListQuerySchema, listPublicNews } from "@/server/services/article.service";

/**
 * Public reader-facing list — browsing itself needs no session (matches the
 * old mock's open-to-everyone UX); an admin/editor session additionally sees
 * draft/scheduled articles via includeAllStatuses.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);

  const parsed = publicNewsListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  const canSeeAllStatuses = !!ctx && hasRole(ctx.user.role, ["admin", "editor"]);
  const result = await listPublicNews(ctx?.user.orgId ?? DEFAULT_ORG_ID, {
    ...parsed.data,
    includeAllStatuses: canSeeAllStatuses ? parsed.data.includeAllStatuses : false,
  });

  return apiOk(result);
}
