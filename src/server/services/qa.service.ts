import { hybridSearchArticleChunks } from "@/server/repositories/article-embedding.repository";
import {
  findChatSession,
  createChatSession,
  createChatMessage,
} from "@/server/repositories/chat.repository";
import { embedChunk, answerQuestion, type QaDocument } from "@/server/ai/gateway";
import { QA_NO_EVIDENCE_MESSAGE, QA_DISCLAIMER } from "@/server/ai/schemas/qa.schema";

const FINAL_DOC_LIMIT = 8;

export interface Citation {
  index: number;
  articleId: string;
  title: string;
  publisher: string | null;
  publishedAt: Date;
}

export interface AskQuestionResult {
  sessionId: string;
  answer: string;
  citations: Citation[];
}

/**
 * F-07 오케스트레이션: 검색(하이브리드) → 생성(인용 강제) → 세션/메시지 영속화.
 * 멀티턴은 세션에 대화가 쌓이는 것만 지원한다 — 이전 턴을 반영해 검색어 자체를
 * 다시 쓰는(query rewriting) 건 이번 1차 구현 범위 밖이다(각 턴은 그 턴의 질문
 * 텍스트만으로 독립적으로 검색한다).
 */
export async function askQuestion(input: {
  orgId: string;
  userId: string;
  sessionId?: string;
  question: string;
}): Promise<AskQuestionResult> {
  const session = input.sessionId
    ? (await findChatSession(input.sessionId, input.orgId, input.userId)) ??
      (await createChatSession(input.orgId, input.userId, input.question))
    : await createChatSession(input.orgId, input.userId, input.question);

  await createChatMessage({ sessionId: session.id, role: "user", content: input.question });

  let questionEmbedding: number[] | null = null;
  try {
    const embedded = await embedChunk(input.question);
    questionEmbedding = embedded.embedding;
  } catch (e) {
    // 벡터 검색 다리만 못 쓰게 된다 — 키워드 검색으로는 계속 답할 수 있으니 여기서
    // 요청 전체를 실패시키지 않는다.
    console.error("[qa.service] question embedding failed, falling back to keyword-only retrieval", e);
  }

  const chunks = await hybridSearchArticleChunks(input.orgId, input.question, questionEmbedding, FINAL_DOC_LIMIT);

  if (chunks.length === 0) {
    const content = `${QA_NO_EVIDENCE_MESSAGE}\n\n${QA_DISCLAIMER}`;
    await createChatMessage({
      sessionId: session.id,
      role: "assistant",
      content,
      retrievalQuery: { question: input.question, candidateCount: 0 },
    });
    return { sessionId: session.id, answer: content, citations: [] };
  }

  const documents: QaDocument[] = chunks.map((c, i) => ({
    index: i + 1,
    articleId: c.articleId,
    title: c.title,
    publisher: c.publisher,
    publishedAt: c.publishedAt,
    chunkText: c.chunkText,
  }));

  const result = await answerQuestion(input.question, documents);
  const answer = `${result.output.answer}\n\n${QA_DISCLAIMER}`;

  const citedIndexes = new Set(
    Array.from(result.output.answer.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1]))
  );
  const citations = documents
    .filter((d) => citedIndexes.has(d.index))
    .map((d) => ({ index: d.index, articleId: d.articleId, title: d.title, publisher: d.publisher, publishedAt: d.publishedAt }));

  await createChatMessage({
    sessionId: session.id,
    role: "assistant",
    content: answer,
    referencedArticleIds: citations.map((c) => c.articleId),
    retrievalQuery: { question: input.question, candidateCount: documents.length, documentIds: documents.map((d) => d.articleId) },
    tokenInput: result.tokenInput,
    tokenOutput: result.tokenOutput,
  });

  return { sessionId: session.id, answer, citations };
}
