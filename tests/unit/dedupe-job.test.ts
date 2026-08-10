import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindArticleById = vi.fn();
const mockSetPipelineStage = vi.fn();
const mockGetOrgSettings = vi.fn();
const mockIsAiBudgetExceeded = vi.fn();
const mockRunAnalyzeJob = vi.fn();
const mockPrismaArticleFindFirst = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: { article: { findFirst: mockPrismaArticleFindFirst } },
}));
vi.mock("@/server/repositories/article.repository", () => ({
  findArticleById: mockFindArticleById,
  setPipelineStage: mockSetPipelineStage,
}));
vi.mock("@/server/services/settings.service", () => ({
  getOrgSettings: mockGetOrgSettings,
}));
vi.mock("@/server/ai/budget", () => ({
  isAiBudgetExceeded: mockIsAiBudgetExceeded,
}));
vi.mock("@/server/pipeline/analyze.job", () => ({
  runAnalyzeJob: mockRunAnalyzeJob,
}));

const { runDedupeJob } = await import("@/server/pipeline/dedupe.job");

const baseArticle = { id: "article-1", orgId: "org-1", title: "테스트 기사" };

describe("runDedupeJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindArticleById.mockResolvedValue(baseArticle);
    mockGetOrgSettings.mockResolvedValue({ duplicateCheck: false });
    mockPrismaArticleFindFirst.mockResolvedValue(null);
  });

  it("AI 예산이 남아있으면 정규화 후 분석까지 진행한다", async () => {
    mockIsAiBudgetExceeded.mockResolvedValue(false);

    await runDedupeJob({ articleId: "article-1" });

    expect(mockSetPipelineStage).toHaveBeenCalledWith("article-1", "normalized");
    expect(mockRunAnalyzeJob).toHaveBeenCalledWith({ articleId: "article-1" });
  });

  it("AI 예산이 초과되면 normalized 단계에서 멈추고 분석을 호출하지 않는다", async () => {
    mockIsAiBudgetExceeded.mockResolvedValue(true);

    await runDedupeJob({ articleId: "article-1" });

    expect(mockSetPipelineStage).toHaveBeenCalledWith("article-1", "normalized");
    expect(mockRunAnalyzeJob).not.toHaveBeenCalled();
  });

  it("중복 기사가 발견되면 예산과 무관하게 분석을 호출하지 않는다", async () => {
    mockGetOrgSettings.mockResolvedValue({ duplicateCheck: true });
    mockPrismaArticleFindFirst.mockResolvedValue({ id: "other-article" });
    mockIsAiBudgetExceeded.mockResolvedValue(false);

    await runDedupeJob({ articleId: "article-1" });

    expect(mockSetPipelineStage).not.toHaveBeenCalled();
    expect(mockRunAnalyzeJob).not.toHaveBeenCalled();
    expect(mockIsAiBudgetExceeded).not.toHaveBeenCalled();
  });
});
