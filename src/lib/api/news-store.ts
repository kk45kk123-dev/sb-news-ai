import { NEWS } from "@/data/news";
import type { News } from "@/lib/schemas/news.schema";

/**
 * Mock table standing in for a real `news` table. Every lib/api/* module reads
 * and writes through the functions below instead of touching NEWS directly, so
 * the day this project connects to Supabase/Postgres, only this file's
 * internals change — every caller (TanStack Query hooks, the ingest pipeline)
 * keeps working against the same function signatures.
 *
 * These functions run client-side (no server route handlers exist yet), so a
 * plain module-level array would reset on every new tab/reload — admin-created
 * articles would vanish the moment you opened the public site in another tab.
 * Backing it with localStorage keeps it consistent across tabs/reloads within
 * the same browser, which is what "메인 뉴스 자동 노출" actually needs to
 * demonstrate. This is a browser-local stand-in, not real shared persistence —
 * swapping in Supabase later removes this limitation entirely.
 */
const STORAGE_KEY = "sb-news-mock-store-v1";

function loadFromStorage(): News[] {
  if (typeof window === "undefined") return [...NEWS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as News[];
  } catch {
    // ignore malformed storage and fall back to seed data
  }
  return [...NEWS];
}

function persist(next: News[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable — mutation still applies for this tab's session
  }
}

let cache: News[] | null = null;

function getStore(): News[] {
  if (cache === null) cache = loadFromStorage();
  return cache;
}

function setStore(next: News[]): void {
  cache = next;
  persist(next);
}

export function listAll(): News[] {
  return getStore();
}

export function findById(id: string): News | undefined {
  return getStore().find((n) => n.id === id);
}

export function findBySlug(slug: string): News | undefined {
  return getStore().find((n) => n.slug === slug);
}

export function insert(news: News): News {
  setStore([news, ...getStore()]);
  return news;
}

export function update(id: string, patch: Partial<News>): News | undefined {
  const store = getStore();
  const idx = store.findIndex((n) => n.id === id);
  if (idx === -1) return undefined;
  const next = store.map((n, i) => (i === idx ? { ...n, ...patch } : n));
  setStore(next);
  return next[idx];
}

export function remove(id: string): boolean {
  const store = getStore();
  const before = store.length;
  setStore(store.filter((n) => n.id !== id));
  return getStore().length < before;
}

export function bumpView(id: string): void {
  update(id, { viewCount: (findById(id)?.viewCount ?? 0) + 1 });
}

export function setLike(id: string, liked: boolean): number {
  const current = findById(id);
  if (!current) return 0;
  const next = Math.max(0, current.likeCount + (liked ? 1 : -1));
  update(id, { likeCount: next });
  return next;
}
