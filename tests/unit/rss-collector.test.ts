import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RssCollector } from "@/server/collectors/rss.collector";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures/rss");

function mockFetchWith(fixtureFile: string, contentType = "application/rss+xml; charset=utf-8") {
  const buffer = readFileSync(path.join(FIXTURES_DIR, fixtureFile));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": contentType }),
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    })
  );
}

const source = { id: "src-1", name: "테스트 경제 뉴스", url: "https://example-news.test/rss.xml", config: {} };

describe("RssCollector", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("정상 피드를 파싱하고 URL을 정규화한다", async () => {
    mockFetchWith("valid-feed.xml");
    const items = await new RssCollector().collect(source);

    expect(items).toHaveLength(2);

    // 쿼리스트링(추적 파라미터)이 제거됐는지
    expect(items[0]!.url).toBe("https://example-news.test/articles/1001");
    expect(items[0]!.urlHash).toMatch(/^[a-f0-9]{64}$/);
    expect(items[0]!.rawContent).toContain("저축은행 업계에 6개월 유예조치");

    // 상대 URL이 절대 URL로 해소됐는지 (§14.2)
    expect(items[1]!.url).toBe("https://example-news.test/articles/1002");
  });

  it("발행일이 없으면 수집 시각으로 대체한다 (크래시하지 않음)", async () => {
    mockFetchWith("missing-pubdate.xml");
    const items = await new RssCollector().collect(source);

    expect(items).toHaveLength(1);
    expect(items[0]!.publishedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(items[0]!.publishedAt.getTime())).toBe(false);
  });

  it("EUC-KR로 인코딩된 피드를 올바르게 디코딩한다", async () => {
    mockFetchWith("euckr-feed.xml", "text/xml"); // 헤더에 charset 없음 → XML 선언에서 감지해야 함
    const items = await new RssCollector().collect(source);

    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("예금자보호한도 상향 논의 재점화");
  });

  it("깨진 XML은 예외를 던진다 (호출부가 출처별로 격리 처리)", async () => {
    mockFetchWith("broken.xml");
    await expect(new RssCollector().collect(source)).rejects.toThrow();
  });

  it("HTTP 오류 응답은 예외를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, headers: new Headers() })
    );
    await expect(new RssCollector().collect(source)).rejects.toThrow(/503/);
  });
});
