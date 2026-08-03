import { prisma } from "@/server/db/client";
import type { AnalyzeOutput } from "@/server/ai/schemas/analyze.schema";

export interface PersistAnalysisInput {
  articleId: string;
  orgId: string;
  output: AnalyzeOutput;
  promptVersionId: string;
  modelId: string;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
}

/**
 * 이전 버전을 is_current=false로 내리고 새 버전을 is_current=true로 삽입한다 (F-02: "동일 기사
 * 재분석 시 이전 버전을 이력으로 남긴다"). uq_analyses_current 부분 유니크 인덱스가 이 불변식을
 * DB 레벨에서도 강제한다.
 */
export async function persistAnalysis(input: PersistAnalysisInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.analysis.updateMany({
      where: { articleId: input.articleId, isCurrent: true },
      data: { isCurrent: false },
    });

    await tx.analysis.create({
      data: {
        articleId: input.articleId,
        summaryLines: input.output.summary_lines,
        keywords: input.output.keywords,
        importance: input.output.importance,
        sbImpactScore: input.output.sb_impact_score,
        sbImpactDirection: input.output.sb_impact_direction,
        sbImpactReason: input.output.sb_impact_reason,
        customerImpact: input.output.customer_impact,
        digitalImpact: input.output.digital_impact,
        risks: input.output.risks,
        actionIdeas: input.output.action_ideas,
        aiComment: input.output.ai_comment,
        evidence: input.output.evidence,
        confidence: input.output.confidence,
        promptVersionId: input.promptVersionId,
        modelId: input.modelId,
        tokenInput: input.tokenInput,
        tokenOutput: input.tokenOutput,
        latencyMs: input.latencyMs,
        isCurrent: true,
      },
    });

    await tx.articleCategory.deleteMany({
      where: { articleId: input.articleId, assignedBy: "ai" },
    });

    const categories = await tx.category.findMany({
      where: { orgId: input.orgId, name: { in: input.output.categories }, isActive: true },
    });
    const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

    let rank = 1;
    for (const name of input.output.categories) {
      const categoryId = categoryIdByName.get(name);
      if (!categoryId) continue; // AI가 존재하지 않는 카테고리명을 반환한 경우 조용히 건너뛴다
      await tx.articleCategory.create({
        data: { articleId: input.articleId, categoryId, rank, assignedBy: "ai" },
      });
      rank += 1;
    }

    await tx.article.update({
      where: { id: input.articleId },
      data: {
        pipelineStage: "analyzed",
        relevance: input.output.sb_impact_score === 1 ? "irrelevant" : "relevant",
      },
    });
  });
}

export async function markAnalysisFailed(articleId: string): Promise<void> {
  await prisma.article.update({ where: { id: articleId }, data: { pipelineStage: "failed" } });
}
