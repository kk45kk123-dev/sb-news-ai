import { prisma } from "@/server/db/client";
import type { KeywordWatch } from "@prisma/client";

export async function listUserWatches(userId: string): Promise<KeywordWatch[]> {
  return prisma.keywordWatch.findMany({ where: { userId }, orderBy: { keyword: "asc" } });
}

export async function countUserWatches(userId: string): Promise<number> {
  return prisma.keywordWatch.count({ where: { userId } });
}

export async function createWatch(input: {
  userId: string;
  keyword: string;
  minImpact?: number;
}): Promise<KeywordWatch> {
  return prisma.keywordWatch.create({
    data: { userId: input.userId, keyword: input.keyword, minImpact: input.minImpact },
  });
}

/** 소유자 확인까지 포함 — 다른 사람의 워치를 id만 알면 지울 수 있으면 안 된다. */
export async function deleteWatch(id: string, userId: string): Promise<boolean> {
  const result = await prisma.keywordWatch.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export interface MatchedWatch {
  id: string;
  userId: string;
  keyword: string;
}

const FUZZY_SIMILARITY_THRESHOLD = 0.45; // article.repository.ts와 같은 값 — "짧은 구절 vs 긴 텍스트" 매칭에 검증된 문턱치.

/**
 * 새로 게시된 기사 하나가 이 조직의 활성 키워드 워치 중 어떤 것과 매칭되는지 한 번의 쿼리로
 * 찾는다. exact는 부분 문자열 포함, fuzzy는 pg_trgm word_similarity(오타 허용)로 비교하고,
 * min_impact가 설정된 워치는 이번 기사의 영향도 점수가 그 이상일 때만 매칭시킨다.
 */
export async function findMatchingWatches(
  orgId: string,
  articleText: string,
  sbImpactScore: number
): Promise<MatchedWatch[]> {
  return prisma.$queryRaw<MatchedWatch[]>`
    SELECT kw.id, kw.user_id AS "userId", kw.keyword
    FROM keyword_watches kw
    JOIN users u ON u.id = kw.user_id
    WHERE u.org_id = ${orgId}::uuid
      AND kw.is_active = true
      AND (kw.min_impact IS NULL OR kw.min_impact <= ${sbImpactScore})
      AND (
        (kw.match_type = 'exact' AND ${articleText} ILIKE '%' || kw.keyword || '%')
        OR (kw.match_type = 'fuzzy' AND word_similarity(kw.keyword, ${articleText}) > ${FUZZY_SIMILARITY_THRESHOLD})
      )
  `;
}
