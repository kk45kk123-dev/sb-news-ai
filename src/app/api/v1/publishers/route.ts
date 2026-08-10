import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { listPublishersForOrg } from "@/server/services/article.service";

/** Public — same open-browsing posture as GET /api/v1/articles. Backs the 검색 페이지's 언론사 필터. */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const publishers = await listPublishersForOrg(ctx?.user.orgId ?? DEFAULT_ORG_ID);
  return apiOk(publishers);
}
