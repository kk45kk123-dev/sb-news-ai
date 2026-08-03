import { prisma } from "@/server/db/client";
import type { Source, SourceStatus } from "@prisma/client";

export async function listActiveSources(): Promise<Source[]> {
  return prisma.source.findMany({ where: { isActive: true } });
}

export async function updateSourceStatus(
  id: string,
  status: SourceStatus,
  consecutiveFailures: number
): Promise<void> {
  await prisma.source.update({
    where: { id },
    data: { status, consecutiveFailures, lastFetchedAt: new Date() },
  });
}
