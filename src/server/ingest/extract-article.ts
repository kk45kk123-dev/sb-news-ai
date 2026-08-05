// linkedom instead of jsdom: pure JS with no native/optional deps (jsdom's
// dynamic internal requires — canvas, ws, etc. — routinely fail to resolve
// in Vercel's serverless function bundle even though local builds are fine).
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { assertPublicUrl, SsrfBlockedError } from "./ssrf-guard";

export class ArticleExtractionError extends Error {}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB — a news article page has no business being bigger
const MAX_REDIRECTS = 5;

export interface ExtractedArticle {
  title: string | null;
  /** Plain text, paragraphs separated by blank lines — ready to hand to Claude or store as News.body. */
  text: string;
  byline: string | null;
}

/**
 * Fetches a URL manually following redirects one hop at a time, re-validating
 * each hop against the SSRF guard. `fetch(url, {redirect:"follow"})` would only
 * let us check the *first* URL — a page could redirect to an internal address
 * (or a public domain could DNS-rebind mid-request) and we'd never see it.
 */
async function fetchWithSsrfGuard(startUrl: string): Promise<Response> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      await assertPublicUrl(currentUrl);
    } catch (e) {
      throw new ArticleExtractionError(
        e instanceof SsrfBlockedError ? e.message : "URL을 확인할 수 없습니다."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SBNewsAI-Ingest/1.0; +https://sb-news-ai.vercel.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (e) {
      throw new ArticleExtractionError(
        e instanceof Error && e.name === "AbortError"
          ? "페이지 응답이 너무 느립니다 (10초 초과)."
          : "URL에 접속할 수 없습니다."
      );
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get("location");
    if (!location) throw new ArticleExtractionError("리다이렉트 응답에 대상 주소가 없습니다.");
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new ArticleExtractionError("리다이렉트가 너무 많습니다.");
}

/** Fetches a URL and pulls the readable article text out of the page via Readability. */
export async function extractArticleFromUrl(url: string): Promise<ExtractedArticle> {
  const res = await fetchWithSsrfGuard(url);

  if (!res.ok) {
    throw new ArticleExtractionError(`페이지를 가져오지 못했습니다 (HTTP ${res.status}).`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    throw new ArticleExtractionError("HTML 페이지가 아닙니다.");
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new ArticleExtractionError("페이지 용량이 너무 큽니다.");
  }

  const html = await res.text();
  if (html.length > MAX_RESPONSE_BYTES) {
    throw new ArticleExtractionError("페이지 용량이 너무 큽니다.");
  }

  const { document } = parseHTML(html, res.url || url);
  const parsed = new Readability(document as unknown as Document).parse();

  if (!parsed || !parsed.textContent || parsed.textContent.trim().length < 30) {
    throw new ArticleExtractionError("본문을 추출하지 못했습니다. 원문을 직접 붙여넣어 주세요.");
  }

  return {
    title: parsed.title?.trim() || null,
    text: parsed.textContent.trim().replace(/\n{3,}/g, "\n\n"),
    byline: parsed.byline?.trim() || null,
  };
}
