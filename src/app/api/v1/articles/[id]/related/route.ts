import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api-response";
import { getAuthContext } from "@/server/auth/guard";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { getRelatedPublicNews } from "@/server/services/article.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  const { id } = await params;
  const items = await getRelatedPublicNews(id, ctx?.user.orgId ?? DEFAULT_ORG_ID);
  return apiOk(items);
}
