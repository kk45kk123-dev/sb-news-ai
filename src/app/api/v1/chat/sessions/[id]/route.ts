import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext } from "@/server/auth/guard";
import { findChatSession, listChatMessages } from "@/server/repositories/chat.repository";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const session = await findChatSession(id, ctx.user.orgId, ctx.user.id);
  if (!session) {
    return apiError(ErrorCode.NOT_FOUND, "대화를 찾을 수 없습니다.", 404);
  }

  const messages = await listChatMessages(session.id);
  return apiOk({
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      referencedArticleIds: m.referencedArticleIds,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
