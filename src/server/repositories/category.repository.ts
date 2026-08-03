import { prisma } from "@/server/db/client";

export async function listActiveCategoryNames(orgId: string): Promise<string[]> {
  const categories = await listActiveCategories(orgId);
  return categories.map((c) => c.name);
}

export async function listActiveCategories(
  orgId: string
): Promise<{ name: string; slug: string }[]> {
  return prisma.category.findMany({
    where: { orgId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });
}
