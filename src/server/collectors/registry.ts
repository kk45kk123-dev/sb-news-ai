import type { SourceType } from "@prisma/client";
import type { Collector } from "./base.collector";
import { RssCollector } from "./rss.collector";

// api/scrape collector는 Phase 2(V1)에서 추가한다 (§6 개발 우선순위).
const registry: Partial<Record<SourceType, Collector>> = {
  rss: new RssCollector(),
};

export function getCollector(type: SourceType): Collector {
  const collector = registry[type];
  if (!collector) {
    throw new Error(`No collector registered for source type: ${type}`);
  }
  return collector;
}
