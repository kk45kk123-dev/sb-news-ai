import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { annotate } from "@/lib/annotate";
import { TermNote } from "@/components/term-note";

type TermNoteElement = ReactElement<{ term: string; definition: string; context?: string }>;

/** annotate()가 반환하는 노드 중 TermNote 엘리먼트만 골라 term으로 찾는다. */
function findTermNote(nodes: ReturnType<typeof annotate>, term: string): TermNoteElement | undefined {
  return nodes.find((n): n is TermNoteElement => {
    if (typeof n !== "object" || n === null || !("type" in n)) return false;
    const el = n as TermNoteElement;
    return el.type === TermNote && el.props.term === term;
  });
}

describe("annotate", () => {
  it("정적 사전(terms.ts)에 있는 용어는 AI glossary 없이도 주석 처리된다", () => {
    const result = annotate("이번 PF 대출 심사가 강화됐다");
    const note = findTermNote(result, "PF");
    expect(note?.props.definition).toContain("사업비를 금융기관이 조달");
  });

  it("정적 사전에 없는 AI 추출 신규 용어도 주석 처리된다 — 정적 사전 부재가 설명 소실로 이어지면 안 된다", () => {
    const result = annotate("이 기업은 하이퍼스케일러向 데이터센터에 투자한다", {
      하이퍼스케일러: { definition: "대규모 클라우드 서비스를 제공하는 대형 IT 기업.", context: "AI 인프라 투자 기업을 지칭." },
    });
    const note = findTermNote(result, "하이퍼스케일러");
    expect(note?.props.definition).toContain("대규모 클라우드");
    expect(note?.props.context).toBe("AI 인프라 투자 기업을 지칭.");
  });

  it("같은 용어가 정적 사전과 AI glossary 둘 다에 있으면 AI 쪽 설명이 우선한다", () => {
    const result = annotate("PF 대출 구조를 살펴본다", {
      PF: { definition: "이 기사에 특화된 PF 설명입니다.", context: "본문 3문단에서 다룸." },
    });
    const note = findTermNote(result, "PF");
    expect(note?.props.definition).toBe("이 기사에 특화된 PF 설명입니다.");
    expect(note?.props.context).toBe("본문 3문단에서 다룸.");
  });

  it("일치하는 용어가 없으면 TermNote 없이 원문 그대로 렌더링된다", () => {
    const result = annotate("오늘 날씨가 맑다");
    expect(findTermNote(result, "PF")).toBeUndefined();
    const text = result
      .map((n) => {
        if (typeof n !== "object" || n === null || !("props" in n)) return n;
        return (n as ReactElement<{ children?: string }>).props.children;
      })
      .join("");
    expect(text).toContain("오늘 날씨가 맑다");
  });
});
