import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisSet = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();
const mockIsAiBudgetExceeded = vi.fn();
const mockFindArticlesByPipelineStages = vi.fn();
const mockListDueSources = vi.fn();
const mockRunCollectJob = vi.fn();
const mockRunNormalizeJob = vi.fn();
const mockRunPurgeJob = vi.fn();
const mockRunBriefingJob = vi.fn();

vi.mock("@/server/redis/client", () => ({
  redis: { set: mockRedisSet, get: mockRedisGet, del: mockRedisDel },
}));
vi.mock("@/server/ai/budget", () => ({
  isAiBudgetExceeded: mockIsAiBudgetExceeded,
}));
vi.mock("@/server/repositories/article.repository", () => ({
  findArticlesByPipelineStages: mockFindArticlesByPipelineStages,
}));
vi.mock("@/server/repositories/source.repository", () => ({
  listDueSources: mockListDueSources,
}));
vi.mock("@/server/pipeline/collect.job", () => ({ runCollectJob: mockRunCollectJob }));
vi.mock("@/server/pipeline/normalize.job", () => ({ runNormalizeJob: mockRunNormalizeJob }));
vi.mock("@/server/pipeline/purge.job", () => ({ runPurgeJob: mockRunPurgeJob }));
vi.mock("@/server/pipeline/briefing.job", () => ({ runBriefingJob: mockRunBriefingJob }));

const { runDailyPipeline } = await import("@/server/pipeline/run-daily-pipeline");

describe("runDailyPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAiBudgetExceeded.mockResolvedValue(false);
    mockFindArticlesByPipelineStages.mockResolvedValue([]);
    mockListDueSources.mockResolvedValue([]);
    mockRunPurgeJob.mockResolvedValue({ purgedCount: 0 });
    mockRunBriefingJob.mockResolvedValue(false);
  });

  it("락을 획득하면 파이프라인을 실행하고 끝나면 락을 해제한다", async () => {
    mockRedisSet.mockResolvedValue("OK");
    mockRedisGet.mockImplementation(async () => mockRedisSet.mock.calls[0]?.[1]);

    const result = await runDailyPipeline();

    expect(result.skippedConcurrentRun).toBe(false);
    expect(mockRunPurgeJob).toHaveBeenCalledTimes(1);
    expect(mockRunBriefingJob).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "lock:daily-pipeline",
      expect.any(String),
      "EX",
      expect.any(Number),
      "NX"
    );
    expect(mockRedisDel).toHaveBeenCalledWith("lock:daily-pipeline");
  });

  it("이미 다른 실행이 락을 쥐고 있으면 아무 작업도 하지 않고 즉시 종료한다", async () => {
    mockRedisSet.mockResolvedValue(null);

    const result = await runDailyPipeline();

    expect(result.skippedConcurrentRun).toBe(true);
    expect(mockFindArticlesByPipelineStages).not.toHaveBeenCalled();
    expect(mockListDueSources).not.toHaveBeenCalled();
    expect(mockRunPurgeJob).not.toHaveBeenCalled();
    expect(mockRunBriefingJob).not.toHaveBeenCalled();
    expect(mockRedisDel).not.toHaveBeenCalled();
  });

  it("락을 다른 실행이 이미 가져갔다면(소유자 불일치) 해제를 건드리지 않는다", async () => {
    mockRedisSet.mockResolvedValue("OK");
    mockRedisGet.mockResolvedValue("some-other-runs-token");

    await runDailyPipeline();

    expect(mockRedisDel).not.toHaveBeenCalled();
  });
});
