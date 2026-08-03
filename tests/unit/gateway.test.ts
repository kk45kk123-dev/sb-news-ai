import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoadActivePromptVersion = vi.fn();
const mockListActiveModelsForTask = vi.fn();
const mockListActiveCategoryNames = vi.fn();
const mockRecordAiCallLog = vi.fn();
const mockCallAnthropic = vi.fn();

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

const { analyzeArticle, NoActiveModelError, SchemaValidationFailedError } = await import(
  "@/server/ai/gateway"
);

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
  sb_impact_direction: "negative",
  sb_impact_reason: "이유",
  risks: [],
  action_ideas: [],
  categories: ["정책"],
  evidence: [],
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
