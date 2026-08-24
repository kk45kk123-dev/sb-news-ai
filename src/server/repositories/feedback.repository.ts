import { prisma } from "@/server/db/client";
import type { Feedback, FeedbackType, FeedbackStatus } from "@prisma/client";

export async function findUserFeedback(userId: string, analysisId: string): Promise<Feedback | null> {
  return prisma.feedback.findFirst({ where: { userId, analysisId } });
}

export async function createFeedback(input: {
  userId: string;
  analysisId: string;
  type: FeedbackType;
  comment?: string;
}): Promise<Feedback> {
  return prisma.feedback.create({
    data: { userId: input.userId, analysisId: input.analysisId, type: input.type, comment: input.comment },
  });
}

export async function updateFeedbackType(id: string, type: FeedbackType, comment?: string): Promise<Feedback> {
  return prisma.feedback.update({ where: { id }, data: { type, comment } });
}

export async function deleteFeedback(id: string): Promise<void> {
  await prisma.feedback.delete({ where: { id } });
}

const feedbackListInclude = {
  analysis: { include: { article: { select: { id: true, orgId: true, title: true } } } },
  user: { select: { id: true, name: true } },
} satisfies import("@prisma/client").Prisma.FeedbackInclude;

export type FeedbackWithRelations = import("@prisma/client").Prisma.FeedbackGetPayload<{
  include: typeof feedbackListInclude;
}>;

/** F-12 축소판: 관리자 검수 큐. §4.1 라우트 맵의 "품질 관리" 메뉴 대응. */
export async function listFeedback(orgId: string, status?: FeedbackStatus): Promise<FeedbackWithRelations[]> {
  return prisma.feedback.findMany({
    where: { analysis: { article: { orgId } }, ...(status ? { status } : {}) },
    include: feedbackListInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** cross-tenant IDOR 방지용 — 상태 변경 전 이 피드백이 호출자의 조직 소속인지 확인해야 한다. */
export async function findFeedbackOrgId(id: string): Promise<string | null> {
  const row = await prisma.feedback.findUnique({
    where: { id },
    select: { analysis: { select: { article: { select: { orgId: true } } } } },
  });
  return row?.analysis.article.orgId ?? null;
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus, reviewerId: string): Promise<Feedback> {
  return prisma.feedback.update({ where: { id }, data: { status, reviewedBy: reviewerId } });
}
