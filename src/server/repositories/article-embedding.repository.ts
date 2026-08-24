import { prisma } from "@/server/db/client";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** §F-07 "핵심 설계 결정": 기사 원문이 아니라 AI 분석 결과 단위(요약+영향분석+키워드)를 임베딩한다. */
export async function replaceArticleAnalysisEmbedding(input: {
  articleId: string;
  chunkText: string;
  embedding: number[];
  model: string;
}): Promise<void> {
  const vec = toVectorLiteral(input.embedding);
  await prisma.$transaction([
    prisma.$executeRaw`
      DELETE FROM article_embeddings
      WHERE article_id = ${input.articleId}::uuid AND chunk_type = 'analysis'::"chunk_type"
    `,
    prisma.$executeRaw`
      INSERT INTO article_embeddings (article_id, chunk_type, chunk_text, embedding, model)
      VALUES (${input.articleId}::uuid, 'analysis'::"chunk_type", ${input.chunkText}, ${vec}::vector, ${input.model})
    `,
  ]);
}

export interface RetrievedChunk {
  articleId: string;
  chunkText: string;
  title: string;
  publisher: string | null;
  publishedAt: Date;
}

interface ScoredRow extends RetrievedChunk {
  rank: number;
}

const KEYWORD_CANDIDATE_LIMIT = 20;
const VECTOR_CANDIDATE_LIMIT = 20;
// pg_trgm word_similarity 토큰 매칭 임계치. article.repository.ts와 같은 값(0.45)을 쓴다 —
// 처음엔 "짧은 토큰이니 문턱을 낮추자"고 0.3으로 시작했다가 로컬 검증 중 완전히 무관한
// 질문("화성 이주 프로젝트...")이 "이주" 토큰 하나로 기사와 매칭되는 걸 실측으로 확인했다
// (2글자 한국어 토큰은 트라이그램 자체가 희소해 낮은 문턱에서 잡음이 심하다). 실제 관련
// 토큰("저축은행", "가계대출", "금리")은 0.45에서도 여전히 0.4~1.0으로 잘 걸린다.
const TOKEN_SIMILARITY_THRESHOLD = 0.45;
const MAX_TOKENS = 8;
const RRF_K = 60; // Reciprocal Rank Fusion 표준 상수

/** 질문 문장을 통째로 word_similarity에 넣으면(조사·어미가 많은 한국어 특성상) 점수가
 *  묻힌다 — 짧은 토큰 단위로 쪼개 각각 매칭해 최댓값을 합산하는 편이 실사용에 더 맞는다. */
function tokenize(question: string): string[] {
  const tokens = question
    .split(/[\s,.!?"'()[\]{}:;·/\\~%]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return Array.from(new Set(tokens)).slice(0, MAX_TOKENS);
}

/**
 * 키워드 leg는 의도적으로 article_embeddings가 아니라 articles/analyses를 직접 조회한다 —
 * article_embeddings에 join하면 임베딩이 아직 없는 기사(OPENAI_API_KEY 미설정, 백필 전
 * 등)가 키워드 검색에서도 통째로 사라져 하이브리드 검색의 "두 다리 중 하나는 살아있다"는
 * 전제가 깨진다(실제로 로컬 검증 중 이 문제로 재현율 0건을 확인해 수정했다).
 */
async function keywordSearch(orgId: string, question: string): Promise<RetrievedChunk[]> {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT a.id AS "articleId", a.title, a.publisher, a.published_at AS "publishedAt",
           (a.title || E'\n' || array_to_string(an.summary_lines, ' ') || E'\n' || an.sb_impact_reason) AS "chunkText"
    FROM articles a
    JOIN analyses an ON an.article_id = a.id AND an.is_current = true
    CROSS JOIN unnest(${tokens}::text[]) AS tok
    WHERE a.org_id = ${orgId}::uuid
      AND a.status = 'published'
    GROUP BY a.id, a.title, a.publisher, a.published_at, an.summary_lines, an.sb_impact_reason
    HAVING MAX(GREATEST(word_similarity(tok, a.title), word_similarity(tok, array_to_string(an.summary_lines, ' ')))) > ${TOKEN_SIMILARITY_THRESHOLD}
    ORDER BY MAX(GREATEST(word_similarity(tok, a.title), word_similarity(tok, array_to_string(an.summary_lines, ' ')))) DESC
    LIMIT ${KEYWORD_CANDIDATE_LIMIT}
  `;
}

async function vectorSearch(orgId: string, questionEmbedding: number[]): Promise<RetrievedChunk[]> {
  const vec = toVectorLiteral(questionEmbedding);
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT ae.article_id AS "articleId", ae.chunk_text AS "chunkText", a.title, a.publisher,
           a.published_at AS "publishedAt"
    FROM article_embeddings ae
    JOIN articles a ON a.id = ae.article_id
    WHERE a.org_id = ${orgId}::uuid
      AND ae.chunk_type = 'analysis'::"chunk_type"
      AND a.status = 'published'
    ORDER BY ae.embedding <=> ${vec}::vector ASC
    LIMIT ${VECTOR_CANDIDATE_LIMIT}
  `;
}

function toRankedMap(rows: RetrievedChunk[]): Map<string, ScoredRow> {
  const map = new Map<string, ScoredRow>();
  rows.forEach((row, i) => map.set(row.articleId, { ...row, rank: i + 1 }));
  return map;
}

/**
 * F-07 하이브리드 검색: 키워드(pg_trgm word_similarity, BM25 대용 — 이 프로젝트엔 실제
 * BM25 확장이 없다) + 벡터(pgvector 코사인 유사도) 두 랭킹을 Reciprocal Rank Fusion으로
 * 합친다. 리랭커 모델은 아직 없다 — RRF 점수 순으로 상위 N개를 그대로 최종 후보로 쓴다
 * (Phase 2 후속 과제).
 */
export async function hybridSearchArticleChunks(
  orgId: string,
  question: string,
  questionEmbedding: number[] | null,
  finalLimit: number
): Promise<RetrievedChunk[]> {
  const [keywordRows, vectorRows] = await Promise.all([
    keywordSearch(orgId, question),
    questionEmbedding ? vectorSearch(orgId, questionEmbedding) : Promise.resolve([]),
  ]);

  const keywordRanked = toRankedMap(keywordRows);
  const vectorRanked = toRankedMap(vectorRows);

  const allIds = new Set([...keywordRanked.keys(), ...vectorRanked.keys()]);
  const fused = Array.from(allIds).map((articleId) => {
    const k = keywordRanked.get(articleId);
    const v = vectorRanked.get(articleId);
    const score = (k ? 1 / (RRF_K + k.rank) : 0) + (v ? 1 / (RRF_K + v.rank) : 0);
    const row = (v ?? k)!;
    return { row, score };
  });

  fused.sort((a, b) => b.score - a.score);
  return fused.slice(0, finalLimit).map((f) => ({
    articleId: f.row.articleId,
    chunkText: f.row.chunkText,
    title: f.row.title,
    publisher: f.row.publisher,
    publishedAt: f.row.publishedAt,
  }));
}
