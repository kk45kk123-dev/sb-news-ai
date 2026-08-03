import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCollector = vi.fn();
const mockFindSourceById = vi.fn();
const mockUpdateSourceStatus = vi.fn();
const mockCreateArticleIfNew = vi.fn();
const mockRecordCrawlLog = vi.fn();
const mockNormalizeQueueAdd = vi.fn();

vi.mock("@/server/collectors/registry", () => ({ getCollector: mockGetCollector }));
vi.mock("@/server/repositories/source.repository", () => ({
  findSourceById: mockFindSourceById,
  updateSourceStatus: mockUpdateSourceStatus,
}));
vi.mock("@/server/repositories/article.repository", () => ({
  createArticleIfNew: mockCreateArticleIfNew,
}));
vi.mock("@/server/repositories/crawl-log.repository", () => ({
  recordCrawlLog: mockRecordCrawlLog,
}));
vi.mock("@/server/pipeline/queues", () => ({ normalizeQueue: { add: mockNormalizeQueueAdd } }));

const { runCollectJob } = await import("@/server/pipeline/collect.job");

const baseSource = {
  id: "src-1",
  orgId: "org-1",
  name: "테스트 출처",
  type: "rss" as const,
  url: "https://example.test/rss.xml",
  config: {},
  isActive: true,
  status: "ok" as const,
  consecutiveFailures: 0,
};

describe("runCollectJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("신규 기사만 normalize 큐에 넣고 출처 상태를 ok로 갱신한다", async () => {
    mockFindSourceById.mockResolvedValue(baseSource);
    mockGetCollector.mockReturnValue({
      collect: vi.fn().mockResolvedValue([
        { url: "https://example.test/a", urlHash: "hash-a" },
        { url: "https://example.test/b", urlHash: "hash-b" }, // 이미 존재 → 중복
      ]),
    });
    mockCreateArticleIfNew
      .mockResolvedValueOnce({ id: "article-a" })
      .mockResolvedValueOnce(null);

    await runCollectJob({ sourceId: "src-1" });

    expect(mockNormalizeQueueAdd).toHaveBeenCalledTimes(1);
    expect(mockNormalizeQueueAdd).toHaveBeenCalledWith("normalize", { articleId: "article-a" });
    expect(mockRecordCrawlLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", itemsFound: 2, itemsNew: 1 })
    );
    expect(mockUpdateSourceStatus).toHaveBeenCalledWith("src-1", "ok", 0);
  });

  it("수집 실패 시 다시 던지고(재시도용) 실패 횟수를 늘린다", async () => {
    mockFindSourceById.mockResolvedValue(baseSource);
    mockGetCollector.mockReturnValue({
      collect: vi.fn().mockRejectedValue(new Error("network down")),
    });

    await expect(runCollectJob({ sourceId: "src-1" })).rejects.toThrow("network down");

    expect(mockRecordCrawlLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", errorMessage: "network down" })
    );
    // 1번째 실패이므로 아직 'error' 상태로 전환되지 않는다 (3회 연속 실패 기준)
    expect(mockUpdateSourceStatus).toHaveBeenCalledWith("src-1", "ok", 1);
  });

  it("3회 연속 실패하면 출처 상태를 error로 전환한다", async () => {
    mockFindSourceById.mockResolvedValue({ ...baseSource, consecutiveFailures: 2 });
    mockGetCollector.mockReturnValue({
      collect: vi.fn().mockRejectedValue(new Error("still down")),
    });

    await expect(runCollectJob({ sourceId: "src-1" })).rejects.toThrow();

    expect(mockUpdateSourceStatus).toHaveBeenCalledWith("src-1", "error", 3);
  });

  it("비활성 출처는 조용히 건너뛴다", async () => {
    mockFindSourceById.mockResolvedValue({ ...baseSource, isActive: false });

    await runCollectJob({ sourceId: "src-1" });

    expect(mockGetCollector).not.toHaveBeenCalled();
  });
});
