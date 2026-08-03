import { describe, it, expect } from "vitest";
import { normalizeUrl, hashUrl } from "@/lib/url";

describe("normalizeUrl", () => {
  it("쿼리스트링과 프래그먼트를 제거한다", () => {
    expect(normalizeUrl("https://example.com/a?utm_source=x#frag")).toBe("https://example.com/a");
  });

  it("트레일링 슬래시를 제거한다 (루트 경로는 유지)", () => {
    expect(normalizeUrl("https://example.com/a/")).toBe("https://example.com/a");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("호스트를 소문자화한다", () => {
    expect(normalizeUrl("https://EXAMPLE.com/a")).toBe("https://example.com/a");
  });
});

describe("hashUrl", () => {
  it("쿼리스트링만 다른 두 URL은 같은 해시를 갖는다 (중복 방지)", () => {
    const a = hashUrl("https://example.com/a?utm_source=rss");
    const b = hashUrl("https://example.com/a?utm_source=email");
    expect(a).toBe(b);
  });

  it("경로가 다르면 다른 해시를 갖는다", () => {
    expect(hashUrl("https://example.com/a")).not.toBe(hashUrl("https://example.com/b"));
  });
});
