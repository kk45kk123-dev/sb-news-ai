import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
const mockRedisGet = vi.fn((key: string) => Promise.resolve(store.get(key) ?? null));
const mockRedisSet = vi.fn((key: string, value: string) => {
  store.set(key, value);
  return Promise.resolve("OK");
});

vi.mock("@/server/redis/client", () => ({
  redis: { get: mockRedisGet, set: mockRedisSet },
}));

const { getMarketSnapshot } = await import("@/server/services/market.service");

function yahooResponse(price: number, prevClose: number) {
  return {
    chart: {
      result: [
        {
          meta: { regularMarketPrice: price, previousClose: prevClose },
          indicators: { quote: [{ close: [prevClose - 5, prevClose, price] }] },
        },
      ],
      error: null,
    },
  };
}

beforeEach(() => {
  store.clear();
  mockRedisGet.mockClear();
  mockRedisSet.mockClear();
});

describe("getMarketSnapshot", () => {
  it("실시간 조회에 성공하면 코스피/코스닥/원달러는 isLive=true, 기준금리는 isLive=false로 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(yahooResponse(2912.54, 2900.24)) }))
    );

    const snapshot = await getMarketSnapshot();
    const kospi = snapshot.items.find((i) => i.id === "kospi");
    const baseRate = snapshot.items.find((i) => i.id === "base-rate");

    expect(kospi?.isLive).toBe(true);
    expect(kospi?.change).toBeCloseTo(12.3, 1);
    expect(kospi?.changeLabel).toBe("+12.30");
    expect(baseRate?.isLive).toBe(false);
    expect(snapshot.items).toHaveLength(4);

    vi.unstubAllGlobals();
  });

  it("두 번째 호출은 캐시된 스냅샷을 그대로 반환하고 외부 API를 다시 호출하지 않는다", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(yahooResponse(2912.54, 2900.24)) })
    );
    vi.stubGlobal("fetch", fetchMock);

    await getMarketSnapshot();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await getMarketSnapshot();

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
    vi.unstubAllGlobals();
  });

  it("외부 API 호출이 실패하면 정적 기본값으로 안전하게 대체한다 (빈 값/에러 대신)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down")))
    );

    const snapshot = await getMarketSnapshot();
    const kospi = snapshot.items.find((i) => i.id === "kospi");

    expect(kospi?.isLive).toBe(false);
    expect(kospi?.value).toBeTruthy();

    vi.unstubAllGlobals();
  });
});
