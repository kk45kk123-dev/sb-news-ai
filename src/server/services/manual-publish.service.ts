import { createHash } from "node:crypto";
import { prisma } from "@/server/db/client";
import { Prisma } from "@prisma/client";
import { hashUrl } from "@/lib/url";
import {
  updateManualArticle,
  deleteManualArticle,
  type ManualArticlePatch,
} from "@/server/repositories/article.repository";
import { toNewsDto } from "@/server/services/article.service";
import type { News, GlossaryTerm } from "@/lib/schemas/news.schema";

export class DuplicateArticleError extends Error {
  constructor(public readonly existingArticleId: string) {
    super("이미 게시된 기사입니다.");
  }
}

export interface PublishManualArticleInput {
  orgId: string;
  userId: string;
  title: string;
  categoryId: string;
  summaryBullets: string[];
  keywords: string[];
  body: string;
  sourceUrl: string | null;
  imageUrl?: string | null;
  /** RSS 자동수집 분석과 동일한 {term, definition, context?} 모양 — analysis.glossary에 그대로 저장된다. */
  glossary?: GlossaryTerm[];
  /** 전체 금융권 관점 중요도(1-5, RSS 자동수집과 같은 기준). 이전에는 이 값을 AI에게
   *  물어보지 않고 무조건 3으로 고정했었다 — 지금은 AI가 실제로 판단한다. */
  importance?: number;
  /** 저축은행 업계 관점 영향도(1-5, RSS 자동수집과 같은 기준). 이전에는 이 값을 AI에게
   *  물어보지 않고 무조건 3으로 고정했었다 — 지금은 AI가 실제로 판단한다. */
  sbImpactScore?: number;
  sbImpactReason?: string;
  modelKey: string;
  tokenInput: number;
  tokenOutput: number;
  latencyMs: number;
  /** Driven by the org's "자동 게시" setting — see settings.service.ts. Defaults to published. */
  status?: "published" | "draft";
}

const MANUAL_SOURCE_NAME = "관리자 수동 등록";
const MANUAL_PROMPT_NAME = "manual-ingest";

/** urlHash is the article table's dedup key; text-only submissions have no URL to hash. */
function computeUrlHash(input: Pick<PublishManualArticleInput, "sourceUrl" | "body">): string {
  if (input.sourceUrl) return hashUrl(input.sourceUrl);
  return createHash("sha256").update(`manual-text:${input.body}`).digest("hex");
}

/**
 * URL이 이미 수집/게시된 기사인지 AI 분석 호출 전에 미리 확인한다 — RSS 자동수집이
 * 먼저 가져간 URL을 관리자가 몰라서 다시 "AI 분석 시작"을 누르면, 어차피 게시 단계
 * (publishManualArticle)에서 DuplicateArticleError로 막힐 걸 AI 호출부터 낭비하게
 * 된다. hashUrl은 RSS 수집기와 동일한 정규화 로직을 쓰므로 같은 URL이면 경로와
 * 무관하게 항상 같은 해시가 나온다.
 */
export async function findExistingArticleIdByUrl(url: string): Promise<string | null> {
  const existing = await prisma.article.findUnique({ where: { urlHash: hashUrl(url) }, select: { id: true } });
  return existing?.id ?? null;
}

async function findOrCreateManualSource(orgId: string) {
  const existing = await prisma.source.findFirst({ where: { orgId, name: MANUAL_SOURCE_NAME } });
  if (existing) return existing;
  return prisma.source.create({
    data: {
      orgId,
      name: MANUAL_SOURCE_NAME,
      type: "scrape",
      url: "internal://manual-ingest",
      config: {},
      categoryHints: [],
      isActive: false, // never picked up by the RSS/scrape scheduler — publish-only marker
      status: "ok",
    },
  });
}

/**
 * The manual ingest route calls Claude directly (not through the AI Gateway —
 * see ADR-007 exception noted in code review) so there's no PromptVersion row
 * for what it actually sent. We record one lazily so the Analysis FK is honest
 * about what generated it, instead of borrowing the automated pipeline's
 * unrelated "analyze" prompt version.
 */
async function findOrCreateManualPromptVersion(userId: string) {
  const prompt = await prisma.prompt.upsert({
    where: { taskType_name: { taskType: "analyze", name: MANUAL_PROMPT_NAME } },
    update: {},
    create: {
      taskType: "analyze",
      name: MANUAL_PROMPT_NAME,
      description: "관리자 URL/텍스트 수동 등록 화면에서 사용하는 경량 분석 프롬프트 (AI Gateway 미경유)",
    },
  });

  const existingVersion = await prisma.promptVersion.findFirst({
    where: { promptId: prompt.id, isActive: true },
  });
  if (existingVersion) return existingVersion;

  return prisma.promptVersion.create({
    data: {
      promptId: prompt.id,
      version: 1,
      systemPrompt: "src/app/api/admin/ingest/analyze/route.ts::buildSystemPrompt()",
      userTemplate: "src/app/api/admin/ingest/analyze/route.ts::buildUserPrompt()",
      variables: {},
      outputSchema: {},
      isActive: true,
      createdBy: userId,
      notes: "코드에서 직접 관리되는 프롬프트 — 실제 텍스트는 route.ts 참조.",
    },
  });
}

async function resolveManualModel(modelKey: string) {
  const model = await prisma.aiModel.findFirst({ where: { modelKey: { startsWith: modelKey } } });
  if (model) return model;
  // Seed data may version the key differently (e.g. "-20251001" suffix) — fall
  // back to any active anthropic model rather than hard-failing the publish.
  const fallback = await prisma.aiModel.findFirst({ where: { provider: "anthropic", isActive: true } });
  if (!fallback) throw new Error(`No AiModel row found for modelKey=${modelKey} and no anthropic fallback exists.`);
  return fallback;
}

/**
 * Persists a manually-ingested article (URL paste or raw text, reviewed and
 * published by an admin) as a real Article + Analysis row. Synchronous, no
 * queue — this bypasses the collector→dedupe→analyze BullMQ pipeline entirely
 * since the admin already supplied the analysis result. This is what the
 * public site (news list/detail/search/home) reads — see article.service.ts's
 * toNewsDto for the read side of this same table.
 */
export async function publishManualArticle(input: PublishManualArticleInput): Promise<{ articleId: string; status: "published" | "draft" }> {
  const status = input.status ?? "published";
  const urlHash = computeUrlHash(input);

  const existing = await prisma.article.findUnique({ where: { urlHash } });
  if (existing) throw new DuplicateArticleError(existing.id);

  const [source, promptVersion, model] = await Promise.all([
    findOrCreateManualSource(input.orgId),
    findOrCreateManualPromptVersion(input.userId),
    resolveManualModel(input.modelKey),
  ]);

  try {
    return await prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          orgId: input.orgId,
          sourceId: source.id,
          url: input.sourceUrl ?? `internal://manual/${urlHash.slice(0, 16)}`,
          urlHash,
          title: input.title,
          description: input.summaryBullets.join(" "),
          rawContent: input.body,
          publisher: input.sourceUrl ? new URL(input.sourceUrl).hostname : "관리자 직접 등록",
          imageUrl: input.imageUrl ?? null,
          publishedAt: new Date(),
          pipelineStage: "analyzed",
          relevance: "relevant",
          categoryId: input.categoryId,
          status,
        },
      });

      await tx.analysis.create({
        data: {
          articleId: article.id,
          summaryLines: input.summaryBullets,
          keywords: input.keywords,
          importance: input.importance ?? 3,
          sbImpactScore: input.sbImpactScore ?? 3,
          sbImpactReason: input.sbImpactReason ?? "관리자 수동 등록 — 세부 영향도 분석은 실행되지 않았습니다.",
          risks: [],
          actionIdeas: [],
          evidence: [],
          glossary: input.glossary ?? [],
          confidence: "low",
          promptVersionId: promptVersion.id,
          modelId: model.id,
          tokenInput: input.tokenInput,
          tokenOutput: input.tokenOutput,
          latencyMs: input.latencyMs,
          isCurrent: true,
        },
      });

      return { articleId: article.id, status };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Lost a race against a concurrent publish of the same URL between our
      // findUnique check and the insert — treat it the same as a normal duplicate.
      const raced = await prisma.article.findUnique({ where: { urlHash } });
      throw new DuplicateArticleError(raced?.id ?? "unknown");
    }
    throw e;
  }
}

/** Admin edit — same table the public site reads, so a save is visible immediately. */
export async function editManualArticle(id: string, orgId: string, patch: ManualArticlePatch): Promise<News | null> {
  const updated = await updateManualArticle(id, orgId, patch);
  return updated ? toNewsDto(updated) : null;
}

/** Admin delete — same table the public site reads, so a delete is invisible immediately. */
export async function removeManualArticle(id: string, orgId: string): Promise<boolean> {
  return deleteManualArticle(id, orgId);
}
