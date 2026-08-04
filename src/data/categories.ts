import type { Category } from "@/lib/schemas/news.schema";

export const CATEGORIES: Category[] = [
  { id: "c1", name: "금융정책", slug: "policy", colorVar: "cat-1" },
  { id: "c2", name: "은행", slug: "banking", colorVar: "cat-2" },
  { id: "c3", name: "저축은행", slug: "savings-bank", colorVar: "cat-3" },
  { id: "c4", name: "부동산", slug: "real-estate", colorVar: "cat-4" },
  { id: "c5", name: "증시", slug: "stock", colorVar: "cat-5" },
  { id: "c6", name: "글로벌경제", slug: "global", colorVar: "cat-6" },
  { id: "c7", name: "핀테크", slug: "fintech", colorVar: "cat-7" },
  { id: "c8", name: "산업동향", slug: "industry", colorVar: "cat-8" },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
