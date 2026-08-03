import { createHash } from "node:crypto";

/**
 * URL 정규화 — 쿼리스트링/프래그먼트 제거, 호스트 소문자화, 트레일링 슬래시 제거 (F-01).
 * 리다이렉트 해소는 순수 함수로 표현할 수 없으므로 collector가 fetch 시점에 최종 URL을
 * 이 함수에 넘긴다.
 */
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;
  return url.toString();
}

/** 정규화된 URL의 sha256 해시 — articles.url_hash 중복 방지 키. */
export function hashUrl(rawUrl: string): string {
  return createHash("sha256").update(normalizeUrl(rawUrl)).digest("hex");
}
