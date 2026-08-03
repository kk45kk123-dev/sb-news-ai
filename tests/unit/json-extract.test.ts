import { describe, it, expect } from "vitest";
import { extractJson } from "@/server/ai/json-extract";

describe("extractJson", () => {
  it("순수 JSON을 파싱한다", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("마크다운 코드블록에 감싸진 JSON을 추출한다 (§14.2 필수 테스트)", () => {
    const raw = '설명입니다.\n```json\n{"a": 1, "b": "x"}\n```\n끝.';
    expect(extractJson(raw)).toEqual({ a: 1, b: "x" });
  });

  it("서문이 붙은 JSON도 추출한다", () => {
    expect(extractJson('여기 결과입니다: {"a": 1}')).toEqual({ a: 1 });
  });

  it("JSON이 아니면 null을 반환한다", () => {
    expect(extractJson("이건 그냥 텍스트입니다")).toBeNull();
  });

  it("깨진 JSON은 null을 반환한다", () => {
    expect(extractJson('{"a": 1,}')).toBeNull();
  });
});
