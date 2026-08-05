import { CATEGORIES } from "@/data/categories";
import { getNewsList } from "@/lib/api/news";
import type { Category } from "@/lib/schemas/news.schema";

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategoryCounts(): Promise<{ categoryId: string; name: string; count: number }[]> {
  // pageSize=1 per category: the list endpoint reports `total` regardless of
  // how many items are returned, so this only needs 8 cheap parallel calls.
  const counts = await Promise.all(
    CATEGORIES.map(async (c) => {
      const { total } = await getNewsList({ categoryId: c.id, pageSize: 1 });
      return { categoryId: c.id, name: c.name, count: total };
    })
  );
  return counts;
}
