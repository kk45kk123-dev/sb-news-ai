import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getPopularPublicNews } from "@/server/services/article.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 5);
  const items = await getPopularPublicNews(ctx?.user.orgId ?? DEFAULT_ORG_ID, Number.isFinite(limit) ? limit : 5);
  return apiOk(items);
}
