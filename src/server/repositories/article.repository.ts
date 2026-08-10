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
  /** "latest"/"views" sort + paginate at the DB level. "impact" (= AI importance
   *  score) still sorts in application code — see function doc below. */
  sort: "latest" | "views" | "impact";
  offset: number;
  limit: number;
  userId?: string;
  /** Public-site (mock-taxonomy) category filter — see Article.categoryId comment. */
  categoryId?: string;
  /** Defaults to ["published"] at the service layer for anonymous/reader callers. */
  statuses?: string[];
  aiRecommendedOnly?: boolean;
  /** Exact match against Article.publisher (see listDistinctPublishers for the picklist). */
  publisher?: string;
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
  if (filters.minImpact || filters.aiRecommendedOnly) {
    where.analyses = {
      some: {
        isCurrent: true,
        ...(filters.minImpact ? { sbImpactScore: { gte: filters.minImpact } } : {}),
        ...(filters.aiRecommendedOnly ? { importance: { gte: 4 } } : {}),
      },
    };
  }
  if (filters.unreadOnly && filters.userId) {
    where.userStates = { none: { userId: filters.userId, isRead: true } };
  }
  if (filters.bookmarkedOnly && filters.userId) {
    where.userStates = { some: { userId: filters.userId, isBookmarked: true } };
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.statuses?.length) {
    where.status = { in: filters.statuses };
  }
  if (filters.publisher) {
    where.publisher = filters.publisher;
  }

  if (filters.sort === "latest" || filters.sort === "views") {
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: articleListInclude,
        orderBy: filters.sort === "views" ? { viewCount: "desc" } : { publishedAt: "desc" },
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.article.count({ where }),
    ]);
    return { items, total };
  }

  // "impact" (AI importance score): list-relation orderBy can't reach into a
  // filtered-to-current analysis row, so sort in application code after
  // narrowing by the date range (fine at this project's volume — see doc above).
  const all = await prisma.article.findMany({
    where,
    include: articleListInclude,
    orderBy: { publishedAt: "desc" },
  });
  const sorted = [...all].sort((a, b) => (b.analyses[0]?.importance ?? 0) - (a.analyses[0]?.importance ?? 0));
  return { items: sorted.slice(filters.offset, filters.offset + filters.limit), total: all.length };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `id`는 URL 경로 세그먼트에서 그대로 들어온다 — UUID 컬럼에 비-UUID 문자열을 조회하면
 * Prisma가 던지는 P2023(Inconsistent column data)를 캐치하지 않고 그대로 흘려보내면
 * 존재하지 않는 라우트로 우연히 흘러들어온 요청(예: 지운 하위 경로와 같은 이름의 id)이
 * 404 대신 500이 된다 — 형식이 안 맞으면 조회 자체를 생략하고 "없음"으로 취급한다.
 */
export async function findArticleWithRelations(id: string, orgId: string): Promise<ArticleWithRelations | null> {
  if (!UUID_RE.test(id)) return null;
  return prisma.article.findFirst({ where: { id, orgId }, include: articleListInclude });
}

const RELATED_LIMIT_DEFAULT = 4;

/** Same categoryId (mock taxonomy), published, excluding the article itself. */
export async function findRelatedArticles(
  orgId: string,
  categoryId: string,
  excludeId: string,
  limit = RELATED_LIMIT_DEFAULT
): Promise<ArticleWithRelations[]> {
  return prisma.article.findMany({
    where: { orgId, status: "published", categoryId, id: { not: excludeId } },
    include: articleListInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

/** Different categoryId but shares at least one keyword with the current article's analysis. */
export async function findSameTopicArticles(
  orgId: string,
  categoryId: string | null,
  keywords: string[],
  excludeId: string,
  limit = RELATED_LIMIT_DEFAULT
): Promise<ArticleWithRelations[]> {
  if (keywords.length === 0) return [];
  return prisma.article.findMany({
    where: {
      orgId,
      status: "published",
      id: { not: excludeId },
      ...(categoryId ? { categoryId: { not: categoryId } } : {}),
      analyses: { some: { isCurrent: true, keywords: { hasSome: keywords } } },
    },
    include: articleListInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

/**
 * 하루 1회 크론 실행이 시간 제한으로 중간에 끊겼을 때, 다음 실행이 이어서 처리할
 * 미완료 기사를 찾는다 — collected/normalized 단계에 머물러 있다는 건 정규화→
 * 중복검사→분석 체인을 끝까지 못 갔다는 뜻이다 (run-daily-pipeline.ts 참고).
 */
export async function findArticlesByPipelineStages(
  orgId: string,
  stages: PipelineStage[],
  limit: number
): Promise<Article[]> {
  return prisma.article.findMany({
    where: { orgId, pipelineStage: { in: stages } },
    orderBy: { collectedAt: "asc" },
    take: limit,
  });
}

export async function findPopularArticles(orgId: string, limit = 5): Promise<ArticleWithRelations[]> {
  return prisma.article.findMany({
    where: { orgId, status: "published" },
    include: articleListInclude,
    orderBy: { viewCount: "desc" },
    take: limit,
  });
}

export async function findArticlesByIds(orgId: string, ids: string[]): Promise<ArticleWithRelations[]> {
  if (ids.length === 0) return [];
  return prisma.article.findMany({
    where: { orgId, id: { in: ids } },
    include: articleListInclude,
  });
}

/** Real distinct publisher values (RSS 출처명/등록 도메인 등) for the search page's 언론사 필터 picklist. */
export async function listDistinctPublishers(orgId: string): Promise<{ publisher: string; count: number }[]> {
  const rows = await prisma.article.groupBy({
    by: ["publisher"],
    where: { orgId, status: "published", publisher: { not: null } },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ publisher: r.publisher as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

/**
 * updateMany (not update) deliberately — a view-count bump for an article
 * that's since been deleted (a stale tab, a bookmarked dead link) is a
 * no-op, not an error. update() throws P2025 when the id doesn't match any
 * row; updateMany() just reports 0 rows affected and returns normally.
 */
export async function bumpViewCount(id: string): Promise<void> {
  await prisma.article.updateMany({ where: { id }, data: { viewCount: { increment: 1 } } });
}

export interface ManualArticlePatch {
  title?: string;
  categoryId?: string;
  status?: string;
  scheduledAt?: string | null;
  summaryBullets?: [string, string, string];
  keywords?: string[];
  body?: string;
}

/** Edit surface for admin-published (manual-ingest) articles — see manual-publish.service.ts. */
export async function updateManualArticle(
  id: string,
  orgId: string,
  patch: ManualArticlePatch
): Promise<ArticleWithRelations | null> {
  const existing = await prisma.article.findFirst({ where: { id, orgId } });
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    if (
      patch.title !== undefined ||
      patch.categoryId !== undefined ||
      patch.status !== undefined ||
      patch.scheduledAt !== undefined ||
      patch.body !== undefined
    ) {
      await tx.article.update({
        where: { id },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.scheduledAt !== undefined
            ? { scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt) : null }
            : {}),
          ...(patch.body !== undefined ? { rawContent: patch.body, description: patch.body.slice(0, 200) } : {}),
        },
      });
    }
    if (patch.summaryBullets !== undefined || patch.keywords !== undefined) {
      const current = await tx.analysis.findFirst({ where: { articleId: id, isCurrent: true } });
      if (current) {
        await tx.analysis.update({
          where: { id: current.id },
          data: {
            ...(patch.summaryBullets !== undefined ? { summaryLines: patch.summaryBullets } : {}),
            ...(patch.keywords !== undefined
              ? { keywords: patch.keywords }
              : {}),
          },
        });
      }
    }
  });

  return prisma.article.findFirst({ where: { id, orgId }, include: articleListInclude });
}

export async function deleteManualArticle(id: string, orgId: string): Promise<boolean> {
  const existing = await prisma.article.findFirst({ where: { id, orgId } });
  if (!existing) return false;
  await prisma.article.delete({ where: { id } });
  return true;
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
