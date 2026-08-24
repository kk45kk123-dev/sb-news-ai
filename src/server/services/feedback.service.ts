import type { Feedback, FeedbackType } from "@prisma/client";
import { findCurrentAnalysis } from "@/server/repositories/analysis.repository";
import {
  findUserFeedback,
  createFeedback,
  updateFeedbackType,
  deleteFeedback,
} from "@/server/repositories/feedback.repository";

export class NoCurrentAnalysisError extends Error {
  constructor() {
    super("이 기사에는 아직 AI 분석 결과가 없습니다.");
  }
}

/** 현재 로그인한 사용자가 이 기사(의 현재 분석)에 남긴 피드백 종류. 없으면 null. */
export async function getMyFeedback(userId: string, articleId: string): Promise<FeedbackType | null> {
  const analysis = await findCurrentAnalysis(articleId);
  if (!analysis) return null;
  const existing = await findUserFeedback(userId, analysis.id);
  return existing?.type ?? null;
}

/**
 * 👍/👎 토글. 같은 버튼을 다시 누르면 취소(삭제), 다른 버튼을 누르면 종류를 바꾼다 —
 * Feedback에는 (user, analysis) 유니크 제약이 DB에 없어서 앱 레벨에서 "사용자당 분석당
 * 최신 의견 하나"만 유지되도록 강제한다.
 */
export async function submitFeedback(input: {
  userId: string;
  articleId: string;
  type: FeedbackType;
  comment?: string;
}): Promise<Feedback | null> {
  const analysis = await findCurrentAnalysis(input.articleId);
  if (!analysis) throw new NoCurrentAnalysisError();

  const existing = await findUserFeedback(input.userId, analysis.id);

  if (existing && existing.type === input.type) {
    await deleteFeedback(existing.id);
    return null;
  }
  if (existing) {
    return updateFeedbackType(existing.id, input.type, input.comment);
  }
  return createFeedback({ userId: input.userId, analysisId: analysis.id, type: input.type, comment: input.comment });
}
