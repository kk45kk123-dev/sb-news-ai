import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { getBriefingForDate } from "@/server/services/briefing.service";

const querySchema = z.object({ date: z.string().date() });

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, "date=YYYY-MM-DD 형식이 필요합니다.", 400);
  }

  const briefing = await getBriefingForDate(ctx.user.orgId, new Date(parsed.data.date));
  return apiOk(briefing);
}
