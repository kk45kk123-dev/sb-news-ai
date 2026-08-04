import { CATEGORIES } from "@/data/categories";
import * as store from "@/lib/api/news-store";
import { networkDelay } from "@/lib/api/shared";
import type { Category } from "@/lib/schemas/news.schema";

export async function getCategories(): Promise<Category[]> {
  await networkDelay(150);
  return CATEGORIES;
}

export async function getCategoryCounts(): Promise<{ categoryId: string; name: string; count: number }[]> {
  await networkDelay(150);
  const published = store.listAll().filter((n) => n.status === "published");
  return CATEGORIES.map((c) => ({
    categoryId: c.id,
    name: c.name,
    count: published.filter((n) => n.categoryId === c.id).length,
  }));
}
