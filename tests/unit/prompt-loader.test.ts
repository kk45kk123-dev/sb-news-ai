import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/server/ai/prompt-loader";

describe("renderTemplate", () => {
  it("플레이스홀더를 치환한다", () => {
    expect(renderTemplate("제목: {title}, 출처: {publisher}", { title: "A", publisher: "B" })).toBe(
      "제목: A, 출처: B"
    );
  });

  it("매칭되지 않는 키는 그대로 남긴다", () => {
    expect(renderTemplate("값: {missing}", {})).toBe("값: {missing}");
  });

  it("같은 키가 여러 번 나오면 모두 치환한다", () => {
    expect(renderTemplate("{x} and {x}", { x: "1" })).toBe("1 and 1");
  });
});
