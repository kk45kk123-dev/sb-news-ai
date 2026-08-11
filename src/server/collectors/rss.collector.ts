import Parser from "rss-parser";
import { decodeXml } from "@/lib/encoding";
import { normalizeUrl, hashUrl } from "@/lib/url";
import { assertPublicUrl, SsrfBlockedError } from "@/server/ingest/ssrf-guard";
import type { Collector, CollectedItem, SourceConfig } from "./base.collector";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "SBNewsAI-Collector/1.0 (+contact: admin@sb-news-ai.internal)";

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

interface RssItem {
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  contentEncoded?: string;
  creator?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string };
}

function parsePublishedAt(item: RssItem): Date {
  const raw = item.isoDate ?? item.pubDate;
  const parsed = raw ? new Date(raw) : null;
  // 발행일 누락/파싱 실패 시 수집 시각으로 대체한다 (§14.2 "발행일 누락" 테스트 항목).
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

function toAbsoluteUrl(link: string, feedUrl: string): string {
  try {
    return new URL(link, feedUrl).toString();
  } catch {
    return link;
  }
}

export class RssCollector implements Collector {
  async collect(source: SourceConfig): Promise<CollectedItem[]> {
    // SSRF 방지: 출처 URL은 관리자가 입력하지만, 계정 탈취/오설정 시 서버가 내부망
    // 주소(예: 클라우드 메타데이터, localhost)로 요청을 보내는 프록시로 악용될 수
    // 있다 — 실제 URL 붙여넣기 등록(server/ingest)에 이미 있는 것과 동일한 DNS
    // resolve 기반 검사를 여기서도 적용한다 (§6 보안 점검).
    try {
      await assertPublicUrl(source.url);
    } catch (e) {
      throw new Error(
        e instanceof SsrfBlockedError ? `RSS fetch blocked: ${e.message}` : "RSS fetch blocked: 알 수 없는 오류"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(source.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`RSS fetch failed: ${source.url} → HTTP ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const xml = decodeXml(buffer, res.headers.get("content-type"));

    const feed = await parser.parseString(xml);

    const items: CollectedItem[] = [];
    for (const raw of feed.items as RssItem[]) {
      if (!raw.link || !raw.title) continue; // 필수 필드 없는 항목은 건너뛴다 (전체 배치를 막지 않음)

      const absoluteUrl = toAbsoluteUrl(raw.link, source.url);
      const normalized = normalizeUrl(absoluteUrl);

      items.push({
        url: normalized,
        urlHash: hashUrl(normalized),
        title: raw.title.trim(),
        description: raw.contentSnippet?.trim(),
        rawContent: raw.contentEncoded ?? raw.content,
        author: raw.creator,
        publisher: source.name,
        publishedAt: parsePublishedAt(raw),
        imageUrl: raw.enclosure?.url,
      });
    }

    return items;
  }
}
