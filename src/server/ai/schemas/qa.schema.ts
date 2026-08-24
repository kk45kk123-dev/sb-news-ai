import { z } from "zod";

// QA_SYSTEM_PROMPT(scripts/seed-sources.ts)에 박혀 있는 고정 문구와 정확히 같아야 한다 —
// "근거 없음"일 때 LLM이 이 문장을 그대로 반환하고, 검색 후보가 0건일 때는 LLM 호출 없이
// 서버가 이 문장을 직접 반환한다(qa.service.ts).
export const QA_NO_EVIDENCE_MESSAGE =
  "수집된 뉴스에서 관련 내용을 찾지 못했습니다. 질문을 바꾸거나 검색 기간을 넓혀보세요.";

// F-07 수용 기준: "모든 답변 끝에 고정 문구 디스클레이머 추가" — LLM에게 맡기지 않고
// 서버가 항상 덧붙인다(누락 위험 제거).
export const QA_DISCLAIMER = "AI 생성 답변입니다. 중요한 판단 전 원문을 확인하세요.";

const CITATION_RE = /\[\d+\]/;

/**
 * F-07 수용 기준: "각주 없는 답변은 렌더링하지 않고 재생성한다." zod의 refine으로 강제하면
 * gateway.ts의 callStructuredTask가 이미 갖고 있는 "스키마 검증 실패 시 1회 재시도" 경로를
 * 그대로 재사용해 이 요구사항을 만족한다 — 인용 검사만을 위한 별도 재시도 루프가 필요 없다.
 */
export const qaOutputSchema = z
  .object({ answer: z.string().min(1) })
  .refine((v) => v.answer.trim() === QA_NO_EVIDENCE_MESSAGE || CITATION_RE.test(v.answer), {
    message: "답변에 근거 문서 인용([1] 형식)이 없습니다.",
  });

export type QaOutput = z.infer<typeof qaOutputSchema>;
