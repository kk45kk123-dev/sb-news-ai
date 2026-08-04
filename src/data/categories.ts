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

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  c1: ["#0F4C81", "#1D6FB8"],
  c2: ["#0C6B54", "#12967A"],
  c3: ["#4A4E93", "#6B6FC4"],
  c4: ["#8A4A16", "#C97A2E"],
  c5: ["#5B3FA0", "#8763D6"],
  c6: ["#0F6E82", "#1CA0B8"],
  c7: ["#146B3A", "#22A35A"],
  c8: ["#8F2236", "#C43A54"],
};

export function getCategoryGradient(categoryId: string): [string, string] {
  return CATEGORY_GRADIENT[categoryId] ?? CATEGORY_GRADIENT.c8!;
}
