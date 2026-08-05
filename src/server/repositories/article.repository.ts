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

export interface ListArticlesFilters {
  orgId: string;
  q?: string;
  categorySlugs?: string[];
  sourceIds?: string[];
  dateFrom: Date;
  dateTo: Date;
  minImpact?: number;
  unreadOnly?: boolean;
  bookmarkedOnly?: boolean;
  sort: "impact" | "recent" | "importance";
  offset: number;
  limit: number;
  userId?: string;
}

const articleListInclude = {
  source: { select: { id: true, name: true, credibility: true } },
  analyses: { where: { isCurrent: true }, take: 1 },
  categories: { include: { category: true }, orderBy: { rank: "asc" as const } },
} satisfies Prisma.ArticleInclude;

export type ArticleWithRelations = Prisma.ArticleGetPayload<{ include: typeof articleListInclude }>;

/**
 * 목록 조회. §17.1("쿼리를 항상 날짜 범위로 제한")에 따라 date_from/date_to를 항상 요구한다
 * (서비스 레이어가 기본값 30일을 채워 넣는다).
 *
 * 정렬: 'recent'는 DB에서 정렬 + offset으로 페이지네이션한다. 'impact'/'importance'는 Prisma가
 * "현재 분석 하나"라는 필터된 리스트 관계를 기준으로 직접 orderBy할 수 없어서(list relation은
 * 집계 정렬만 지원), 날짜 범위로 이미 좁혀진 결과를 애플리케이션에서 정렬한다. 이 프로젝트
 * 규모(일 50~100건, §17.1)에서는 충분하지만, 전역적으로 올바른 커서 기반 정렬은 아니다 —
 * 트래픽이 커지면 정렬 키를 컬럼으로 역정규화하는 걸 재검토해야 한다.
 */
export async function listArticles(
  filters: ListArticlesFilters
): Promise<{ items: ArticleWithRelations[]; total: number }> {
  const where: Prisma.ArticleWhereInput = {
    orgId: filters.orgId,
    publishedAt: { gte: filters.dateFrom, lte: filters.dateTo },
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.categorySlugs?.length) {
    where.categories = { some: { category: { slug: { in: filters.categorySlugs } } } };
  }
  if (filters.sourceIds?.length) {
    where.sourceId = { in: filters.sourceIds };
  }
  if (filters.minImpact) {
    where.analyses = { some: { isCurrent: true, sbImpactScore: { gte: filters.minImpact } } };
  }
  if (filters.unreadOnly && filters.userId) {
    where.userStates = { none: { userId: filters.userId, isRead: true } };
  }
  if (filters.bookmarkedOnly && filters.userId) {
    where.userStates = { some: { userId: filters.userId, isBookmarked: true } };
  }

  if (filters.sort === "recent") {
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: articleListInclude,
        orderBy: { publishedAt: "desc" },
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.article.count({ where }),
    ]);
    return { items, total };
  }

  // impact/importance: 날짜 범위로 이미 좁힌 뒤 애플리케이션에서 정렬 (위 문서 참조)
  const all = await prisma.article.findMany({
    where,
    include: articleListInclude,
    orderBy: { publishedAt: "desc" },
  });
  const sorted = [...all].sort((a, b) => {
    const scoreA = filters.sort === "impact" ? (a.analyses[0]?.sbImpactScore ?? 0) : (a.analyses[0]?.importance ?? 0);
    const scoreB = filters.sort === "impact" ? (b.analyses[0]?.sbImpactScore ?? 0) : (b.analyses[0]?.importance ?? 0);
    return scoreB - scoreA;
  });
  return { items: sorted.slice(filters.offset, filters.offset + filters.limit), total: all.length };
}

export async function findArticleWithRelations(id: string, orgId: string): Promise<ArticleWithRelations | null> {
  return prisma.article.findFirst({ where: { id, orgId }, include: articleListInclude });
}

const BRIEFING_CANDIDATE_LIMIT = 20; // F-03: "후보 20건을 AI에 넘겨 최종 5건과 선정 사유를 받는다"

/**
 * F-03 브리핑 후보. 선정 로직: sb_impact_score 우선 → importance (§F-03). 클러스터 크기·출처
 * 신뢰도 가중은 Phase 2(F-11 클러스터링)와 함께 들어간다 — 지금은 클러스터 개념이 없다.
 */
export async function listBriefingCandidates(
  orgId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<ArticleWithRelations[]> {
  const candidates = await prisma.article.findMany({
    where: {
      orgId,
      publishedAt: { gte: dateFrom, lte: dateTo },
      pipelineStage: "analyzed",
      analyses: { some: { isCurrent: true } },
    },
    include: articleListInclude,
  });

  return [...candidates]
    .sort((a, b) => {
      const scoreDiff = (b.analyses[0]?.sbImpactScore ?? 0) - (a.analyses[0]?.sbImpactScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.analyses[0]?.importance ?? 0) - (a.analyses[0]?.importance ?? 0);
    })
    .slice(0, BRIEFING_CANDIDATE_LIMIT);
}
