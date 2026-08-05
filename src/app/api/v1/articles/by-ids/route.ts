import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getPublicNewsByIds } from "@/server/services/article.service";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const items = await getPublicNewsByIds(ctx?.user.orgId ?? DEFAULT_ORG_ID, ids);
  return apiOk(items);
}
