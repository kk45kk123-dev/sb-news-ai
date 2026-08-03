// §20-3, §16.4-(1): 외부 텍스트(기사 본문 등)에서 프롬프트 인젝션 의심 패턴을 탐지한다.
// 차단하지는 않는다 — 구분자(<article> 태그)로 감싸는 것이 1차 방어선이고, 이 함수는
// 탐지 시 로그를 남겨 관리자가 확인할 수 있게 하는 2차 안전장치다.
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore (all|previous|above) instructions?/i,
  /disregard (all|previous|above)/i,
  /system\s*:/i,
  /you are now/i,
  /당신은\s*이제/,
  /이전\s*(지시|명령)(을|를)?\s*(무시|잊)/,
  /시스템\s*[:：]/,
];

export interface InjectionScanResult {
  suspicious: boolean;
  matchedPatterns: string[];
}

export function scanForPromptInjection(text: string): InjectionScanResult {
  const matched = SUSPICIOUS_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
  return { suspicious: matched.length > 0, matchedPatterns: matched };
}

/** 외부 텍스트를 데이터 구분자로 감싼다 — 시스템 프롬프트가 이 태그 안은 데이터라고 명시한다. */
export function wrapAsData(tag: string, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}
