import type { Article, Analysis } from "@prisma/client";
import { findArticleById } from "@/server/repositories/article.repository";
import { findCurrentAnalysis } from "@/server/repositories/analysis.repository";
import { replaceArticleAnalysisEmbedding } from "@/server/repositories/article-embedding.repository";
import { embedChunk } from "@/server/ai/gateway";

/** §F-07 "핵심 설계 결정"과 정확히 같은 구성 — 기사 원문이 아니라 AI가 스스로 만든
 *  분석 결과(3줄 요약 + 영향 분석 + 키워드)만 임베딩한다. */
export function buildAnalysisChunkText(
  article: Pick<Article, "title">,
  analysis: Pick<Analysis, "summaryLines" | "sbImpactReason" | "customerImpact" | "digitalImpact" | "keywords">
): string {
  const parts = [
    `제목: ${article.title}`,
    `요약: ${analysis.summaryLines.join(" ")}`,
    `저축은행 영향: ${analysis.sbImpactReason}`,
  ];
  if (analysis.customerImpact) parts.push(`고객 영향: ${analysis.customerImpact}`);
  if (analysis.digitalImpact) parts.push(`디지털 영향: ${analysis.digitalImpact}`);
  if (analysis.keywords.length > 0) parts.push(`키워드: ${analysis.keywords.join(", ")}`);
  return parts.join("\n");
}

/**
 * 기사 게시/수정 흐름(manual-publish.service.ts)과 자동 분석 파이프라인(analysis.service.ts)
 * 양쪽에서 호출한다. 의도적으로 예외를 삼킨다 — 임베딩은 나중에 AI 질의응답 검색에서만
 * 쓰이는 부가 데이터라, OPENAI_API_KEY 미설정이나 일시적 네트워크 오류 때문에 기사 게시
 * 자체(이 프로젝트의 핵심 기능)가 실패해서는 안 된다. 실패는 콘솔에 남겨 운영 중 알아챌
 * 수 있게 한다.
 */
export async function generateArticleEmbedding(articleId: string): Promise<void> {
  try {
    const [article, analysis] = await Promise.all([findArticleById(articleId), findCurrentAnalysis(articleId)]);
    if (!article || !analysis) return;

    const chunkText = buildAnalysisChunkText(article, analysis);
    const { embedding, model } = await embedChunk(chunkText);
    await replaceArticleAnalysisEmbedding({ articleId, chunkText, embedding, model: model.modelKey });
  } catch (e) {
    console.error(`[embedding.service] failed to embed article ${articleId}`, e);
  }
}
