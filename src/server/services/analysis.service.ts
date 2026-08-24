import { findArticleById } from "@/server/repositories/article.repository";
import { persistAnalysis, markAnalysisFailed } from "@/server/repositories/analysis.repository";
import { analyzeArticle } from "@/server/ai/gateway";
import { generateArticleEmbedding } from "@/server/services/embedding.service";
import { notifyKeywordWatchers } from "@/server/services/keyword-watch.service";

/**
 * F-02 수용 기준: "분석 실패 기사도 제목·링크는 목록에 노출된다" — 실패해도 article 행은
 * 그대로 두고 pipeline_stage만 'failed'로 남긴다. 여기서 에러를 삼키지 않고 다시 던지는 이유는
 * BullMQ가 재시도(analyze 큐의 attempts=3)를 적용하게 하기 위함이다 — 반복 실패해도 최종적으로는
 * markAnalysisFailed가 남긴 'failed' 상태가 유지된다.
 */
export async function runAnalysisForArticle(articleId: string): Promise<void> {
  const article = await findArticleById(articleId);
  if (!article) return;

  const content = article.rawContent ?? article.description ?? article.title;

  try {
    const result = await analyzeArticle({
      articleId: article.id,
      orgId: article.orgId,
      title: article.title,
      publisher: article.publisher,
      publishedAt: article.publishedAt,
      content,
    });

    await persistAnalysis({
      articleId: article.id,
      orgId: article.orgId,
      output: result.output,
      promptVersionId: result.promptVersion.id,
      modelId: result.model.id,
      tokenInput: result.tokenInput,
      tokenOutput: result.tokenOutput,
      latencyMs: result.latencyMs,
    });

    await generateArticleEmbedding(article.id); // F-07 — 예외를 삼키므로 분석 성공 여부에 영향 없음

    if (article.status === "published") {
      try {
        await notifyKeywordWatchers({
          orgId: article.orgId,
          articleId: article.id,
          title: article.title,
          summaryLines: result.output.summary_lines,
          keywords: result.output.keywords,
          sbImpactScore: result.output.sb_impact_score,
        });
      } catch (notifyError) {
        console.error(`[analysis.service] keyword watch notification failed for article ${article.id}`, notifyError);
      }
    }
  } catch (e) {
    await markAnalysisFailed(article.id);
    throw e; // BullMQ 재시도 대상 (analyze 큐의 attempts=3)
  }
}
