import type { NewsListParams } from "@/lib/schemas/news.schema";

export const queryKeys = {
  news: {
    list: (params: Partial<NewsListParams>) => ["news", "list", params] as const,
    detail: (id: string) => ["news", "detail", id] as const,
    related: (id: string) => ["news", "related", id] as const,
    sameTopic: (id: string) => ["news", "same-topic", id] as const,
    popular: () => ["news", "popular"] as const,
    memo: (id: string) => ["news", "memo", id] as const,
    feedback: (id: string) => ["news", "feedback", id] as const,
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
    notifications: () => ["admin", "notifications"] as const,
    feedback: (status?: string) => ["admin", "feedback", status ?? "all"] as const,
  },
  market: {
    snapshot: () => ["market", "snapshot"] as const,
  },
  chat: {
    sessions: () => ["chat", "sessions"] as const,
    session: (id: string) => ["chat", "sessions", id] as const,
  },
  keywordWatches: {
    mine: () => ["keyword-watches", "mine"] as const,
  },
  notifications: {
    mine: () => ["notifications", "mine"] as const,
  },
};
