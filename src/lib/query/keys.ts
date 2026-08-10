import type { NewsListParams } from "@/lib/schemas/news.schema";

export const queryKeys = {
  news: {
    list: (params: Partial<NewsListParams>) => ["news", "list", params] as const,
    detail: (id: string) => ["news", "detail", id] as const,
    related: (id: string) => ["news", "related", id] as const,
    sameTopic: (id: string) => ["news", "same-topic", id] as const,
    popular: () => ["news", "popular"] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    counts: () => ["categories", "counts"] as const,
  },
  search: {
    results: (params: Partial<NewsListParams>) => ["search", "results", params] as const,
    suggestions: (q: string) => ["search", "suggestions", q] as const,
  },
  publishers: {
    all: () => ["publishers"] as const,
  },
  briefing: {
    today: () => ["briefing", "today"] as const,
  },
  admin: {
    newsList: (params: Partial<NewsListParams>) => ["admin", "news", "list", params] as const,
    dashboard: () => ["admin", "dashboard"] as const,
    settings: () => ["admin", "settings"] as const,
  },
  market: {
    snapshot: () => ["market", "snapshot"] as const,
  },
};
