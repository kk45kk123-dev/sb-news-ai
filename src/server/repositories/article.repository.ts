import { prisma } from "@/server/db/client";
import type { Article, PipelineStage } from "@prisma/client";
import type { CollectedItem } from "@/server/collectors/base.collector";
import { Prisma } from "@prisma/client";

/**
 * url_hash UNIQUE 제약(F-01 수용 기준)에 기대어 멱등하게 삽입한다.
 * 이미 존재하면 null을 반환한다 — 호출부는 이 경우 이후 파이프라인 단계를 건너뛴다.
 */
export async function createArticleIfNew(
  orgId: string,
  sourceId: string,
  item: CollectedItem
): Promise<Article | null> {
  try {
    return await prisma.article.create({
      data: {
        orgId,
        sourceId,
        url: item.url,
        urlHash: item.urlHash,
        title: item.title,
        description: item.description,
        rawContent: item.rawContent,
        author: item.author,
        publisher: item.publisher,
        publishedAt: item.publishedAt,
        imageUrl: item.imageUrl,
        pipelineStage: "collected",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return null; // url_hash 중복 — 이미 수집된 기사
    }
    throw e;
  }
}

export async function findArticleById(id: string): Promise<Article | null> {
  return prisma.article.findUnique({ where: { id } });
}

export async function setPipelineStage(id: string, stage: PipelineStage): Promise<void> {
  await prisma.article.update({ where: { id }, data: { pipelineStage: stage } });
}

export async function updateNormalizedFields(
  id: string,
  data: { title: string; description?: string }
): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { title: data.title, description: data.description, pipelineStage: "normalized" },
  });
}

export async function purgeExpiredRawContent(cutoff: Date): Promise<number> {
  const result = await prisma.article.updateMany({
    where: { publishedAt: { lt: cutoff }, rawContent: { not: null } },
    data: { rawContent: null, contentPurgedAt: new Date() },
  });
  return result.count;
}
