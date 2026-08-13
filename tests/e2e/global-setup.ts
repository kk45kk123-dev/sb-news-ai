import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { E2E_ARTICLE_TITLE, E2E_ARTICLE_URL, E2E_MARKER_PUBLISHER } from "./fixtures";

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

/** 공개 화면(목록/검색/카테고리/상세) 테스트가 기댈 수 있는 고정 기사 1건을 심는다. */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findFirstOrThrow();
    const source = await prisma.source.findFirstOrThrow({ where: { orgId: org.id, name: "관리자 수동 등록" } });
    const model = await prisma.aiModel.findFirstOrThrow({ where: { provider: "anthropic" } });
    const prompt = await prisma.prompt.upsert({
      where: { taskType_name: { taskType: "analyze", name: "manual-ingest" } },
      update: {},
      create: { taskType: "analyze", name: "manual-ingest", description: "e2e" },
    });
    const promptVersion =
      (await prisma.promptVersion.findFirst({ where: { promptId: prompt.id, isActive: true } })) ??
      (await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          systemPrompt: "e2e",
          userTemplate: "e2e",
          variables: {},
          outputSchema: {},
          isActive: true,
          notes: "e2e",
        },
      }));

    const urlHash = hashUrl(E2E_ARTICLE_URL);
    await prisma.article.deleteMany({ where: { urlHash } }); // 이전 실행 잔여물 정리

    const article = await prisma.article.create({
      data: {
        orgId: org.id,
        sourceId: source.id,
        url: E2E_ARTICLE_URL,
        urlHash,
        title: E2E_ARTICLE_TITLE,
        description: E2E_ARTICLE_TITLE,
        rawContent:
          "E2E 테스트를 위한 30자 이상의 고정 본문입니다. DSR과 LTV 등 기본 용어사전 항목과 " +
          "HBM 같은 항목이 실제로 하이라이트되는지 확인하는 목적입니다.",
        publisher: E2E_MARKER_PUBLISHER,
        imageUrl: null,
        publishedAt: new Date(),
        pipelineStage: "analyzed",
        relevance: "relevant",
        categoryId: "c3",
        status: "published",
      },
    });

    await prisma.analysis.create({
      data: {
        articleId: article.id,
        summaryLines: ["E2E 요약 1", "E2E 요약 2", "E2E 요약 3"],
        keywords: ["E2E"],
        importance: 3,
        sbImpactScore: 4,
        sbImpactReason: "E2E 테스트용 사유",
        risks: [],
        actionIdeas: [],
        evidence: [],
        glossary: [{ term: "DSR", definition: "E2E 테스트용 정의" }],
        confidence: "medium",
        promptVersionId: promptVersion.id,
        modelId: model.id,
        tokenInput: 0,
        tokenOutput: 0,
        latencyMs: 0,
        isCurrent: true,
      },
    });

    process.env.E2E_ARTICLE_ID = article.id;
    console.log(`[e2e global-setup] seeded article ${article.id}`);
  } finally {
    await prisma.$disconnect();
  }
}
