import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoadActivePromptVersion = vi.fn();
const mockListActiveModelsForTask = vi.fn();
const mockListActiveCategoryNames = vi.fn();
const mockRecordAiCallLog = vi.fn();
const mockCallAnthropic = vi.fn();
const mockEmbedText = vi.fn();

vi.mock("@/server/ai/prompt-loader", async () => {
  const actual = await vi.importActual<typeof import("@/server/ai/prompt-loader")>(
    "@/server/ai/prompt-loader"
  );
  return { ...actual, loadActivePromptVersion: mockLoadActivePromptVersion };
});
vi.mock("@/server/repositories/ai-model.repository", () => ({
  listActiveModelsForTask: mockListActiveModelsForTask,
}));
vi.mock("@/server/repositories/category.repository", () => ({
  listActiveCategoryNames: mockListActiveCategoryNames,
}));
vi.mock("@/server/repositories/ai-call-log.repository", () => ({
  recordAiCallLog: mockRecordAiCallLog,
}));
vi.mock("@/server/ai/providers/anthropic.provider", () => ({ callAnthropic: mockCallAnthropic }));
vi.mock("@/server/ai/providers/openai.provider", () => ({ embedText: mockEmbedText }));

const { analyzeArticle, generateBriefing, answerQuestion, embedChunk, NoActiveModelError, SchemaValidationFailedError } =
  await import("@/server/ai/gateway");

const promptVersion = {
  id: "pv-1",
  systemPrompt: "카테고리: {categories}\n스키마: {schema}",
  userTemplate: "제목: {title}\n본문: {content}",
};
const model = {
  id: "model-1",
  modelKey: "claude-sonnet-5",
  costPer1kInput: 0.003,
  costPer1kOutput: 0.015,
};
const validOutput = {
  summary_lines: ["a", "b", "c"],
  keywords: ["k1", "k2", "k3"],
  importance: 3,
  sb_impact_score: 4,
  sb_impact_reason: "이유",
  risks: [],
  action_ideas: [],
  categories: ["정책"],
  evidence: [],
  glossary: [{ term: "DSR", definition: "총부채원리금상환비율." }],
  confidence: "high",
};

const baseInput = {
  articleId: "article-1",
  orgId: "org-1",
  title: "테스트 기사",
  publisher: "테스트 언론사",
  publishedAt: new Date("2026-08-03T00:00:00Z"),
  content: "기사 본문 내용",
};

describe("analyzeArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivePromptVersion.mockResolvedValue(promptVersion);
    mockListActiveModelsForTask.mockResolvedValue([model]);
    mockListActiveCategoryNames.mockResolvedValue(["정책", "금리"]);
  });

  it("활성 모델이 없으면 즉시 실패하고 LLM을 호출하지 않는다", async () => {
    mockListActiveModelsForTask.mockResolvedValue([]);
    await expect(analyzeArticle(baseInput)).rejects.toThrow(NoActiveModelError);
    expect(mockCallAnthropic).not.toHaveBeenCalled();
  });

  it("첫 시도에 유효한 JSON이면 검증 후 결과를 반환한다", async () => {
    mockCallAnthropic.mockResolvedValue({
      text: JSON.stringify(validOutput),
      tokenInput: 100,
      tokenOutput: 50,
    });

    const result = await analyzeArticle(baseInput);

    expect(result.output.sb_impact_score).toBe(4);
    expect(result.output.glossary).toEqual([{ term: "DSR", definition: "총부채원리금상환비율." }]);
    expect(mockCallAnthropic).toHaveBeenCalledTimes(1);
    expect(mockRecordAiCallLog).toHaveBeenCalledTimes(1);
    expect(mockRecordAiCallLog).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
  });

  it("첫 시도가 스키마를 위반하면 1회 재시도하고, 재시도가 성공하면 결과를 반환한다 (F-02)", async () => {
    mockCallAnthropic
      .mockResolvedValueOnce({ text: '{"invalid": true}', tokenInput: 10, tokenOutput: 5 })
      .mockResolvedValueOnce({ text: JSON.stringify(validOutput), tokenInput: 10, tokenOutput: 5 });

    const result = await analyzeArticle(baseInput);

    expect(mockCallAnthropic).toHaveBeenCalledTimes(2);
    expect(result.output.confidence).toBe("high");
    expect(mockRecordAiCallLog).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "error" }));
    expect(mockRecordAiCallLog).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: "success" }));
  });

  it("두 번 모두 스키마를 위반하면 실패 처리한다 (1회 재시도 후 실패, F-02)", async () => {
    mockCallAnthropic.mockResolvedValue({ text: "이건 JSON이 아닙니다", tokenInput: 10, tokenOutput: 5 });

    await expect(analyzeArticle(baseInput)).rejects.toThrow(SchemaValidationFailedError);
    expect(mockCallAnthropic).toHaveBeenCalledTimes(2);
  });
});

describe("generateBriefing", () => {
  const candidates = [
    { id: "article-1", title: "기사1", summaryLines: ["a", "b"], sbImpactScore: 5 },
    { id: "article-2", title: "기사2", summaryLines: ["c", "d"], sbImpactScore: 3 },
  ];
  const validBriefing = {
    overview: "오늘의 흐름 요약",
    items: [{ article_id: "article-1", why_now: "지금 중요한 이유", so_what: "대응 방향" }],
    follow_ups: ["후속 이슈 1"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivePromptVersion.mockResolvedValue({
      id: "pv-briefing",
      systemPrompt: "브리핑 작성",
      userTemplate: "후보: {candidates}",
    });
    mockListActiveModelsForTask.mockResolvedValue([model]);
  });

  it("후보 목록을 프롬프트에 주입하고 검증된 브리핑을 반환한다", async () => {
    mockCallAnthropic.mockResolvedValue({
      text: JSON.stringify(validBriefing),
      tokenInput: 200,
      tokenOutput: 80,
    });

    const result = await generateBriefing(candidates);

    expect(result.output.items).toHaveLength(1);
    expect(mockCallAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ userPrompt: expect.stringContaining("article-1") })
    );
  });

  it("활성 모델이 없으면 즉시 실패한다", async () => {
    mockListActiveModelsForTask.mockResolvedValue([]);
    await expect(generateBriefing(candidates)).rejects.toThrow(NoActiveModelError);
  });
});

describe("answerQuestion (F-07)", () => {
  const documents = [
    {
      index: 1,
      articleId: "article-1",
      title: "저축은행 대출 금리 인상",
      publisher: "테스트 언론사",
      publishedAt: new Date("2026-08-20T00:00:00Z"),
      chunkText: "저축은행 5곳이 가계대출 금리를 0.3%p 인상했다.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadActivePromptVersion.mockResolvedValue({
      id: "pv-qa",
      systemPrompt: "질의응답",
      userTemplate: "<documents>{documents}</documents><question>{user_question}</question>",
    });
    mockListActiveModelsForTask.mockResolvedValue([model]);
  });

  it("근거 문서 번호([n])가 포함된 답변은 그대로 통과한다", async () => {
    mockCallAnthropic.mockResolvedValue({
      text: JSON.stringify({ answer: "가계대출 금리가 0.3%p 인상됐습니다[1]." }),
      tokenInput: 100,
      tokenOutput: 50,
    });

    const result = await answerQuestion("저축은행 대출 금리 어떻게 됐어?", documents);

    expect(result.output.answer).toContain("[1]");
    expect(mockCallAnthropic).toHaveBeenCalledTimes(1);
    expect(mockCallAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ userPrompt: expect.stringContaining("저축은행 대출 금리 인상") })
    );
  });

  it("근거 없음 고정 문구는 인용 번호 없이도 통과한다 (§F-07 수용 기준)", async () => {
    mockCallAnthropic.mockResolvedValue({
      text: JSON.stringify({ answer: "수집된 뉴스에서 관련 내용을 찾지 못했습니다. 질문을 바꾸거나 검색 기간을 넓혀보세요." }),
      tokenInput: 50,
      tokenOutput: 20,
    });

    const result = await answerQuestion("무관한 질문", documents);
    expect(result.output.answer).toContain("찾지 못했습니다");
  });

  it("인용 번호도 없고 고정 문구도 아니면 1회 재시도 후에도 실패하면 던진다 (§F-07: 각주 없는 답변은 렌더링하지 않는다)", async () => {
    mockCallAnthropic.mockResolvedValue({
      text: JSON.stringify({ answer: "금리가 인상됐습니다." }), // 인용 번호 없음
      tokenInput: 50,
      tokenOutput: 20,
    });

    await expect(answerQuestion("저축은행 대출 금리 어떻게 됐어?", documents)).rejects.toThrow(
      SchemaValidationFailedError
    );
    expect(mockCallAnthropic).toHaveBeenCalledTimes(2);
  });

  it("첫 시도에 인용이 빠졌어도 재시도에서 인용을 포함하면 통과한다", async () => {
    mockCallAnthropic
      .mockResolvedValueOnce({ text: JSON.stringify({ answer: "금리가 인상됐습니다." }), tokenInput: 10, tokenOutput: 5 })
      .mockResolvedValueOnce({
        text: JSON.stringify({ answer: "금리가 인상됐습니다[1]." }),
        tokenInput: 10,
        tokenOutput: 5,
      });

    const result = await answerQuestion("저축은행 대출 금리 어떻게 됐어?", documents);
    expect(result.output.answer).toContain("[1]");
    expect(mockCallAnthropic).toHaveBeenCalledTimes(2);
  });
});

describe("embedChunk (F-07)", () => {
  const embedModel = { id: "model-embed", modelKey: "text-embedding-3-small", costPer1kInput: 0.00002, costPer1kOutput: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListActiveModelsForTask.mockResolvedValue([embedModel]);
  });

  it("활성 embed 모델이 없으면 즉시 실패하고 임베딩 API를 호출하지 않는다", async () => {
    mockListActiveModelsForTask.mockResolvedValue([]);
    await expect(embedChunk("텍스트")).rejects.toThrow(NoActiveModelError);
    expect(mockEmbedText).not.toHaveBeenCalled();
  });

  it("성공하면 임베딩 벡터를 반환하고 성공 로그를 남긴다", async () => {
    mockEmbedText.mockResolvedValue({ embedding: [0.1, 0.2, 0.3], tokenInput: 20 });

    const result = await embedChunk("저축은행 관련 텍스트");

    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(mockRecordAiCallLog).toHaveBeenCalledWith(expect.objectContaining({ taskType: "embed", status: "success" }));
  });

  it("임베딩 API가 실패하면 에러 로그를 남기고 예외를 다시 던진다", async () => {
    mockEmbedText.mockRejectedValue(new Error("OPENAI_API_KEY is not configured"));

    await expect(embedChunk("텍스트")).rejects.toThrow("OPENAI_API_KEY is not configured");
    expect(mockRecordAiCallLog).toHaveBeenCalledWith(expect.objectContaining({ taskType: "embed", status: "error" }));
  });
});
