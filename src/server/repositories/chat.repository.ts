import { prisma } from "@/server/db/client";
import type { ChatSession, ChatMessage, Prisma } from "@prisma/client";

export async function findChatSession(id: string, orgId: string, userId: string): Promise<ChatSession | null> {
  return prisma.chatSession.findFirst({ where: { id, orgId, userId } });
}

export async function createChatSession(orgId: string, userId: string, title: string): Promise<ChatSession> {
  return prisma.chatSession.create({ data: { orgId, userId, title: title.slice(0, 200) } });
}

export async function listChatSessions(orgId: string, userId: string, limit = 30): Promise<ChatSession[]> {
  return prisma.chatSession.findMany({ where: { orgId, userId }, orderBy: { updatedAt: "desc" }, take: limit });
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  return prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
}

export interface CreateChatMessageInput {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  referencedArticleIds?: string[];
  retrievalQuery?: Prisma.InputJsonValue;
  tokenInput?: number;
  tokenOutput?: number;
}

/** §F-07 수용 기준: "질문/답변/참조 문서 ID를 모두 로그로 남긴다" — 이 행 자체가 그 로그다. */
export async function createChatMessage(input: CreateChatMessageInput): Promise<ChatMessage> {
  const message = await prisma.chatMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      referencedArticleIds: input.referencedArticleIds ?? [],
      retrievalQuery: input.retrievalQuery,
      tokenInput: input.tokenInput,
      tokenOutput: input.tokenOutput,
    },
  });
  // ChatMessage는 별도 테이블이라 생성해도 세션의 @updatedAt이 자동 갱신되지 않는다 —
  // "최근 대화 순" 정렬(listChatSessions)이 의미 있으려면 직접 touch해야 한다.
  await prisma.chatSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } });
  return message;
}
