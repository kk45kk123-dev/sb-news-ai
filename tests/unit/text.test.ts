import { describe, it, expect } from "vitest";
import { stripHtml, decodeHtmlEntities, collapseWhitespace, normalizeText } from "@/lib/text";

describe("stripHtml", () => {
  it("HTML 태그를 제거한다", () => {
    expect(stripHtml("<p>안녕 <b>세상</b></p>")).toBe("안녕 세상");
  });
});

describe("decodeHtmlEntities", () => {
  it("일반적인 엔티티를 디코딩한다", () => {
    expect(decodeHtmlEntities("PF &amp; 부동산 &lt;금융&gt;")).toBe("PF & 부동산 <금융>");
  });
});

describe("collapseWhitespace", () => {
  it("연속 공백/개행을 하나로 줄이고 트림한다", () => {
    expect(collapseWhitespace("  금융위\n\n  발표  ")).toBe("금융위 발표");
  });
});

describe("normalizeText", () => {
  it("태그 제거 + 엔티티 디코딩 + 공백 정리를 함께 적용한다", () => {
    expect(normalizeText("<p>PF &amp;   재구조화</p>\n")).toBe("PF & 재구조화");
  });
});
