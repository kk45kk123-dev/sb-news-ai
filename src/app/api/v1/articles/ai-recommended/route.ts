import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getAiRecommendedPublicNews } from "@/server/services/article.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 4);
  const items = await getAiRecommendedPublicNews(ctx?.user.orgId ?? DEFAULT_ORG_ID, Number.isFinite(limit) ? limit : 4);
  return apiOk(items);
}
