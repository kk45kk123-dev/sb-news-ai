import { describe, it, expect, vi, afterEach } from "vitest";

// extract-article.ts는 fetch 직전에 SSRF 가드가 실제 DNS lookup을 한다 — 테스트용
// fake 도메인이 실제로 resolve되지 않으므로 공개 IP로 정상 resolve됨을 가정한다.
const mockDnsLookup = vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
vi.mock("node:dns/promises", () => ({ default: { lookup: mockDnsLookup }, lookup: mockDnsLookup }));

const { extractArticleFromUrl, ArticleExtractionError } = await import("@/server/ingest/extract-article");

const ARTICLE_BODY = `<article><p>${"저축은행 업계의 부동산 PF 대출 부실 우려가 커지고 있다는 내용의 테스트 기사 본문입니다. ".repeat(3)}</p></article>`;

function mockFetchWithHtml(html: string, url = "https://news.example-test/article/1") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: async () => html,
    })
  );
}

describe("extractArticleFromUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("og:image 메타태그를 대표 이미지로 추출한다", async () => {
    mockFetchWithHtml(`<html><head>
      <meta property="og:image" content="https://cdn.example-test/thumb.jpg" />
      <title>테스트 기사</title>
      </head><body>${ARTICLE_BODY}</body></html>`);

    const result = await extractArticleFromUrl("https://news.example-test/article/1");

    expect(result.imageUrl).toBe("https://cdn.example-test/thumb.jpg");
  });

  it("og:image가 없으면 twitter:image로 대체한다", async () => {
    mockFetchWithHtml(`<html><head>
      <meta name="twitter:image" content="https://cdn.example-test/twitter-thumb.jpg" />
      </head><body>${ARTICLE_BODY}</body></html>`);

    const result = await extractArticleFromUrl("https://news.example-test/article/1");

    expect(result.imageUrl).toBe("https://cdn.example-test/twitter-thumb.jpg");
  });

  it("상대 경로 og:image는 페이지 주소 기준 절대 URL로 변환한다", async () => {
    mockFetchWithHtml(
      `<html><head><meta property="og:image" content="/images/thumb.jpg" /></head><body>${ARTICLE_BODY}</body></html>`,
      "https://news.example-test/section/article/1"
    );

    const result = await extractArticleFromUrl("https://news.example-test/section/article/1");

    expect(result.imageUrl).toBe("https://news.example-test/images/thumb.jpg");
  });

  it("og:image/twitter:image가 모두 없으면 null을 반환한다 (본문 추출은 계속 성공)", async () => {
    mockFetchWithHtml(`<html><head></head><body>${ARTICLE_BODY}</body></html>`);

    const result = await extractArticleFromUrl("https://news.example-test/article/1");

    expect(result.imageUrl).toBeNull();
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("http/https가 아닌 scheme(예: javascript:)은 거부하고 null로 처리한다", async () => {
    mockFetchWithHtml(
      `<html><head><meta property="og:image" content="javascript:alert(1)" /></head><body>${ARTICLE_BODY}</body></html>`
    );

    const result = await extractArticleFromUrl("https://news.example-test/article/1");

    expect(result.imageUrl).toBeNull();
  });

  it("본문 추출 자체가 실패하면(짧은 본문) ArticleExtractionError를 던진다", async () => {
    mockFetchWithHtml(`<html><body><p>짧음</p></body></html>`);

    await expect(extractArticleFromUrl("https://news.example-test/article/1")).rejects.toThrow(
      ArticleExtractionError
    );
  });
});
