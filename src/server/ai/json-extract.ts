/**
 * LLM이 지시를 어기고 ```json 코드블록이나 서문을 붙이는 경우가 흔하다 (§14.2 필수 테스트).
 * 가장 바깥 {...} 블록만 추출해 파싱한다. 실패하면 null.
 */
export function extractJson(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : raw;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
