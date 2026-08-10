import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCountAiCallsSince = vi.fn();

vi.mock("@/server/repositories/ai-call-log.repository", () => ({
  countAiCallsSince: mockCountAiCallsSince,
}));

const { isAiBudgetExceeded, AI_DAILY_CALL_LIMIT, AiBudgetExceededError } = await import(
  "@/server/ai/budget"
);

describe("isAiBudgetExceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("최근 24시간 호출 수가 한도 미만이면 초과가 아니다", async () => {
    mockCountAiCallsSince.mockResolvedValue(AI_DAILY_CALL_LIMIT - 1);
    expect(await isAiBudgetExceeded()).toBe(false);
  });

  it("한도에 정확히 도달하면 초과로 판단한다", async () => {
    mockCountAiCallsSince.mockResolvedValue(AI_DAILY_CALL_LIMIT);
    expect(await isAiBudgetExceeded()).toBe(true);
  });

  it("한도를 넘으면 초과로 판단한다", async () => {
    mockCountAiCallsSince.mockResolvedValue(AI_DAILY_CALL_LIMIT + 1);
    expect(await isAiBudgetExceeded()).toBe(true);
  });

  it("최근 24시간 롤링 윈도우 기준으로 카운트를 조회한다", async () => {
    mockCountAiCallsSince.mockResolvedValue(0);
    const before = Date.now();
    await isAiBudgetExceeded();
    const since = mockCountAiCallsSince.mock.calls[0]![0] as Date;
    const windowMs = before - since.getTime();
    expect(windowMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    expect(windowMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  it("AiBudgetExceededError 메시지에 한도 값이 포함된다", () => {
    const err = new AiBudgetExceededError();
    expect(err.message).toContain(String(AI_DAILY_CALL_LIMIT));
  });
});
