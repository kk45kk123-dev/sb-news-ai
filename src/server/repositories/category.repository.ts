import { prisma } from "@/server/db/client";

export async function listActiveCategoryNames(orgId: string): Promise<string[]> {
  const categories = await prisma.category.findMany({
    where: { orgId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  return categories.map((c) => c.name);
}
