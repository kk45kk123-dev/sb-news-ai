import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { listChatSessions } from "@/server/repositories/chat.repository";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }

  const sessions = await listChatSessions(ctx.user.orgId, ctx.user.id);
  return apiOk(
    sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))
  );
}
